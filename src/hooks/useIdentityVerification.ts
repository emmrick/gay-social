import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface IdentityVerification {
  id: string;
  user_id: string;
  selfie_url: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  documents_deleted: boolean;
  admin_viewed_at: string | null;
  admin_screenshot_detected: boolean;
  created_at: string;
  updated_at: string;
}

export const useIdentityVerification = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: verification, isLoading, refetch } = useQuery({
    queryKey: ['identity-verification', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('identity_verifications')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as IdentityVerification | null;
    },
    enabled: !!user,
  });

  const createVerification = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('identity_verifications')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity-verification'] });
    },
  });

  const uploadDocument = async (file: File, type: 'selfie' | 'id_front' | 'id_back') => {
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('identity-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // For private buckets, store only the file path (not signed URL)
    // Signed URLs will be generated when admin views the documents
    return fileName;
  };

  const submitVerification = useMutation({
    mutationFn: async ({ 
      selfieUrl, 
      idFrontUrl, 
      idBackUrl 
    }: { 
      selfieUrl: string; 
      idFrontUrl: string; 
      idBackUrl: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check current verification status
      const { data: currentVerification } = await supabase
        .from('identity_verifications')
        .select('id, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (currentVerification?.status === 'rejected') {
        // Delete the old rejected record first (RLS allows this)
        const { error: deleteError } = await supabase
          .from('identity_verifications')
          .delete()
          .eq('user_id', user.id);
          
        if (deleteError) {
          console.error('Delete error:', deleteError);
          throw deleteError;
        }
          
        // Create a new record
        const { error: insertError } = await supabase
          .from('identity_verifications')
          .insert({
            user_id: user.id,
            selfie_url: selfieUrl,
            id_front_url: idFrontUrl,
            id_back_url: idBackUrl,
            submitted_at: new Date().toISOString(),
            status: 'pending',
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
      } else if (currentVerification) {
        // Update existing pending record
        const { error } = await supabase
          .from('identity_verifications')
          .update({
            selfie_url: selfieUrl,
            id_front_url: idFrontUrl,
            id_back_url: idBackUrl,
            submitted_at: new Date().toISOString(),
            status: 'pending',
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
      } else {
        // No existing record, create a new one
        const { error: insertError } = await supabase
          .from('identity_verifications')
          .insert({
            user_id: user.id,
            selfie_url: selfieUrl,
            id_front_url: idFrontUrl,
            id_back_url: idBackUrl,
            submitted_at: new Date().toISOString(),
            status: 'pending',
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity-verification'] });
    },
  });

  return {
    verification,
    isLoading,
    refetch,
    createVerification,
    uploadDocument,
    submitVerification,
  };
};

// Admin hook for managing verifications
export const useAdminVerifications = () => {
  const queryClient = useQueryClient();

  const { data: pendingVerifications, isLoading } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: async () => {
      // First get verifications
      const { data: verifications, error: verError } = await supabase
        .from('identity_verifications')
        .select('*')
        .eq('status', 'pending')
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: true });

      if (verError) throw verError;
      if (!verifications || verifications.length === 0) return [];

      // Then get profiles for those users
      const userIds = verifications.map(v => v.user_id);
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, age, region')
        .in('user_id', userIds);

      if (profError) throw profError;

      // Combine data
      return verifications.map(v => ({
        ...v,
        profiles: profiles?.find(p => p.user_id === v.user_id) || null
      }));
    },
  });

  const markAsViewed = useMutation({
    mutationFn: async (verificationId: string) => {
      const { error } = await supabase
        .from('identity_verifications')
        .update({ admin_viewed_at: new Date().toISOString() })
        .eq('id', verificationId);

      if (error) throw error;
    },
  });

  const reportScreenshot = useMutation({
    mutationFn: async (verificationId: string) => {
      const { error } = await supabase
        .from('identity_verifications')
        .update({ admin_screenshot_detected: true })
        .eq('id', verificationId);

      if (error) throw error;
    },
  });

  const approveVerification = useMutation({
    mutationFn: async ({ verificationId, userId }: { verificationId: string; userId: string }) => {
      // Update verification status
      const { error: verifyError } = await supabase
        .from('identity_verifications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          documents_deleted: true,
          selfie_url: null,
          id_front_url: null,
          id_back_url: null,
        })
        .eq('id', verificationId);

      if (verifyError) throw verifyError;

      // Update profile to verified
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Delete documents from storage
      const { data: files } = await supabase.storage
        .from('identity-documents')
        .list(userId);

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${userId}/${f.name}`);
        await supabase.storage
          .from('identity-documents')
          .remove(filePaths);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
    },
  });

  const rejectVerification = useMutation({
    mutationFn: async ({ verificationId, reason }: { verificationId: string; reason: string }) => {
      const { error } = await supabase
        .from('identity_verifications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: reason,
        })
        .eq('id', verificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
    },
  });

  return {
    pendingVerifications,
    isLoading,
    markAsViewed,
    reportScreenshot,
    approveVerification,
    rejectVerification,
  };
};

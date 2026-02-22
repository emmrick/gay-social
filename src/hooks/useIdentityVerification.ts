import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  notifyVerificationSubmitted, 
  notifyVerificationApproved, 
  notifyVerificationRejected 
} from '@/services/pushNotificationService';

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

  // Delete rejected verification to allow retry
  const deleteRejectedVerification = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Delete any old documents from storage first
      const { data: files } = await supabase.storage
        .from('identity-documents')
        .list(user.id);

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage
          .from('identity-documents')
          .remove(filePaths);
      }

      // Delete the rejected verification record
      const { error } = await supabase
        .from('identity_verifications')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'rejected');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity-verification'] });
    },
  });

  const uploadDocument = async (file: File, type: 'selfie' | 'id_front' | 'id_back') => {
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;

    console.log('Uploading document:', fileName, 'Size:', file.size);

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('identity-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Erreur d'upload: ${uploadError.message}`);
    }

    console.log('Upload successful:', uploadData);

    // For private buckets, we store the file path and create signed URLs when needed
    // Return just the file path - admin will create signed URLs when viewing
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

      const { data, error } = await supabase
        .from('identity_verifications')
        .update({
          selfie_url: selfieUrl,
          id_front_url: idFrontUrl,
          id_back_url: idBackUrl,
          submitted_at: new Date().toISOString(),
          status: 'pending',
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('La mise à jour a échoué. Veuillez réessayer.');

      // Send confirmation notification to the user
      await notifyVerificationSubmitted(user.id);
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
    deleteRejectedVerification,
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

      // Notify user that verification is approved
      await notifyVerificationApproved(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['pending-verifications-count'] });
    },
  });

  const rejectVerification = useMutation({
    mutationFn: async ({ verificationId, reason, userId }: { verificationId: string; reason: string; userId?: string }) => {
      const { data: verification, error: fetchError } = await supabase
        .from('identity_verifications')
        .select('user_id')
        .eq('id', verificationId)
        .single();

      if (fetchError) throw fetchError;

      const targetUserId = userId || verification?.user_id;

      // RGPD Compliance: Delete documents from storage on rejection
      if (targetUserId) {
        const { data: files } = await supabase.storage
          .from('identity-documents')
          .list(targetUserId);

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${targetUserId}/${f.name}`);
          await supabase.storage
            .from('identity-documents')
            .remove(filePaths);
        }
      }

      // Update verification status and clear document URLs
      const { error } = await supabase
        .from('identity_verifications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: reason,
          documents_deleted: true,
          selfie_url: null,
          id_front_url: null,
          id_back_url: null,
        })
        .eq('id', verificationId);

      if (error) throw error;

      // Notify user that verification was rejected
      if (targetUserId) {
        await notifyVerificationRejected(targetUserId, reason);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['pending-verifications-count'] });
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

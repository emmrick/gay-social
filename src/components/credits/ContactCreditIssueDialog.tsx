import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  MessageCircle, 
  Loader2, 
  Send,
  CreditCard,
  User,
  Mail,
  MapPin,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ContactCreditIssueDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ContactCreditIssueDialog = ({ trigger, open: controlledOpen, onOpenChange }: ContactCreditIssueDialogProps) => {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled or uncontrolled open state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  
  // Form state
  const [last4Digits, setLast4Digits] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [department, setDepartment] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Validate required fields
      if (!last4Digits || last4Digits.length !== 4) {
        throw new Error('Veuillez entrer les 4 derniers chiffres de votre carte');
      }
      if (!lastName.trim()) throw new Error('Veuillez entrer votre nom');
      if (!firstName.trim()) throw new Error('Veuillez entrer votre prénom');
      if (!email.trim()) throw new Error('Veuillez entrer votre adresse mail');
      if (!username.trim()) throw new Error('Veuillez entrer votre pseudonyme');
      if (!age.trim()) throw new Error('Veuillez entrer votre âge');
      if (!department.trim()) throw new Error('Veuillez entrer votre département');

      // Create a notification/report for admins
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'credit_issue_report',
          title: '💳 Demande de crédit - Paiement effectué',
          message: `Réclamation achat crédits:\n\n` +
            `📋 Informations de paiement:\n` +
            `• 4 derniers chiffres CB: ${last4Digits}\n` +
            `• Nom: ${lastName}\n` +
            `• Prénom: ${firstName}\n` +
            `• Email: ${email}\n\n` +
            `📱 Compte GayConnect:\n` +
            `• Pseudonyme: ${username}\n` +
            `• Âge: ${age} ans\n` +
            `• Département: ${department}`,
          is_read: false,
        });

      if (error) throw error;

      // Also insert into a dedicated table for better tracking (using reports)
      const { error: reportError } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: user.id, // Self-report for credit issue
          reason: 'other',
          report_type: 'credit_purchase_issue',
          description: JSON.stringify({
            last4Digits,
            lastName,
            firstName,
            email,
            username,
            age,
            department,
          }),
          status: 'pending',
        });

      if (reportError) {
        console.warn('Could not create detailed report:', reportError);
      }
    },
    onSuccess: () => {
      toast.success('Demande envoyée !', {
        description: 'Un administrateur examinera votre demande rapidement.',
      });
      setIsOpen(false);
      // Reset form
      setLast4Digits('');
      setLastName('');
      setFirstName('');
      setEmail('');
      setUsername('');
      setAge('');
      setDepartment('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'envoi');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 w-full">
            <MessageCircle className="w-4 h-4" />
            J'ai payé mais pas reçu mes crédits
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Signaler un problème d'achat
          </DialogTitle>
          <DialogDescription>
            Remplissez ce formulaire pour nous aider à identifier votre paiement et créditer votre compte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Information Section */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm font-medium text-amber-600 mb-2">📋 Informations de paiement</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              4 derniers chiffres de votre carte bancaire
            </Label>
            <Input
              type="text"
              maxLength={4}
              pattern="[0-9]*"
              inputMode="numeric"
              placeholder="1234"
              value={last4Digits}
              onChange={(e) => setLast4Digits(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                placeholder="Dupont"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input
                placeholder="Jean"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Adresse mail
            </Label>
            <Input
              type="email"
              placeholder="jean.dupont@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Account Information Section */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-sm font-medium text-primary mb-2">📱 Votre compte GayConnect</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Pseudonyme (nom sur le site)
            </Label>
            <Input
              placeholder="MonPseudo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Âge
              </Label>
              <Input
                type="number"
                min="18"
                max="99"
                placeholder="25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Département
              </Label>
              <Input
                placeholder="75 - Paris"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-xs text-muted-foreground">
              Ces informations nous permettent de vérifier votre paiement et de créditer le bon compte. Vos données sont traitées de manière confidentielle.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="gap-2"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactCreditIssueDialog;

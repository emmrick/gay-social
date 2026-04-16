import { useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username?: string | null;
}

type Mode = "template" | "custom";

const TEMPLATES = [
  { value: "welcome", label: "Bienvenue", description: "Email de bienvenue complet (présentation de l'app)" },
  { value: "verification-reminder", label: "Rappel de vérification", description: "Inviter l'utilisateur à vérifier son identité" },
  { value: "verification-confirmed", label: "Identité vérifiée", description: "Confirmer la validation de l'identité" },
];

const customSchema = z.object({
  subject: z.string().trim().min(3, "Sujet trop court").max(150, "Sujet trop long (max 150)"),
  message: z.string().trim().min(10, "Message trop court").max(5000, "Message trop long (max 5000)"),
});

const SendEmailDialog = ({ open, onOpenChange, userId, username }: SendEmailDialogProps) => {
  const [mode, setMode] = useState<Mode>("custom");
  const [templateName, setTemplateName] = useState("welcome");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const reset = () => {
    setSubject("");
    setMessage("");
    setTemplateName("welcome");
    setMode("custom");
  };

  const handleSend = async () => {
    setSending(true);
    try {
      let payload: { templateName: string; templateData?: Record<string, any> };

      if (mode === "custom") {
        const parsed = customSchema.safeParse({ subject, message });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Données invalides");
          setSending(false);
          return;
        }
        payload = {
          templateName: "custom-message",
          templateData: { subject: parsed.data.subject, message: parsed.data.message },
        };
      } else {
        payload = { templateName };
      }

      const { error } = await supabase.functions.invoke("send-user-email", {
        body: { userId, ...payload },
      });

      if (error) throw error;

      toast.success("Email envoyé avec succès");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      console.error("Email send failed", e);
      toast.error("Échec de l'envoi de l'email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!sending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Envoyer un email
          </DialogTitle>
          <DialogDescription>
            {username ? `Destinataire : ${username}` : "Envoi à l'utilisateur sélectionné"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "custom" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("custom")}
            >
              Message libre
            </Button>
            <Button
              type="button"
              variant={mode === "template" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("template")}
            >
              Template
            </Button>
          </div>

          {mode === "template" ? (
            <div className="space-y-2">
              <Label>Modèle d'email</Label>
              <Select value={templateName} onValueChange={setTemplateName}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <p className="font-medium">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email-subject">Sujet</Label>
                <Input
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Information importante"
                  maxLength={150}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-message">Message</Label>
                <Textarea
                  id="email-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Votre message..."
                  rows={8}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/5000
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendEmailDialog;

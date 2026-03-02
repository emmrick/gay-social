import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, ChevronRight, ChevronDown, Eye, EyeOff, Bot, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  useAllFAQArticles, useFAQMutations, 
  useAllChatbotNodes, useChatbotNodeMutations,
  type FAQArticle, type HelpChatbotNode 
} from '@/hooks/useFAQ';

const FAQManagementPanel = () => {
  const [activeTab, setActiveTab] = useState<'faq' | 'chatbot'>('faq');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Centre d'aide</h2>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="faq" className="gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            Chatbot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq">
          <FAQEditor />
        </TabsContent>
        <TabsContent value="chatbot">
          <ChatbotEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ==================== FAQ Editor ====================

const FAQEditor = () => {
  const { data: articles = [] } = useAllFAQArticles();
  const { createArticle, updateArticle, deleteArticle } = useFAQMutations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ category: 'general', question: '', answer: '', is_published: true });

  const handleCreate = () => {
    if (!newForm.question.trim() || !newForm.answer.trim()) return;
    createArticle.mutate({
      ...newForm,
      display_order: articles.length,
    }, {
      onSuccess: () => {
        setShowNew(false);
        setNewForm({ category: 'general', question: '', answer: '', is_published: true });
      },
    });
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{articles.length} article(s)</p>
        <Button size="sm" onClick={() => setShowNew(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Ajouter
        </Button>
      </div>

      {showNew && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Catégorie</Label>
                <Input value={newForm.category} onChange={(e) => setNewForm(p => ({ ...p, category: e.target.value }))} placeholder="ex: compte" />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch checked={newForm.is_published} onCheckedChange={(v) => setNewForm(p => ({ ...p, is_published: v }))} />
                  <Label className="text-xs">Publié</Label>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Question</Label>
              <Input value={newForm.question} onChange={(e) => setNewForm(p => ({ ...p, question: e.target.value }))} placeholder="Comment...?" />
            </div>
            <div>
              <Label className="text-xs">Réponse</Label>
              <Textarea value={newForm.answer} onChange={(e) => setNewForm(p => ({ ...p, answer: e.target.value }))} rows={3} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Annuler</Button>
              <Button size="sm" onClick={handleCreate} disabled={createArticle.isPending}>
                <Save className="w-3.5 h-3.5 mr-1" /> Créer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-2">
          {articles.map((article) => (
            <FAQArticleRow
              key={article.id}
              article={article}
              isEditing={editingId === article.id}
              onEdit={() => setEditingId(article.id)}
              onCancelEdit={() => setEditingId(null)}
              onUpdate={(updates) => {
                updateArticle.mutate({ id: article.id, ...updates }, {
                  onSuccess: () => setEditingId(null),
                });
              }}
              onDelete={() => deleteArticle.mutate(article.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const FAQArticleRow = ({ article, isEditing, onEdit, onCancelEdit, onUpdate, onDelete }: {
  article: FAQArticle;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Partial<FAQArticle>) => void;
  onDelete: () => void;
}) => {
  const [form, setForm] = useState({ category: article.category, question: article.question, answer: article.answer, is_published: article.is_published });

  if (isEditing) {
    return (
      <Card className="border-primary/30">
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Catégorie</Label>
              <Input value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm(p => ({ ...p, is_published: v }))} />
                <Label className="text-xs">Publié</Label>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">Question</Label>
            <Input value={form.question} onChange={(e) => setForm(p => ({ ...p, question: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Réponse</Label>
            <Textarea value={form.answer} onChange={(e) => setForm(p => ({ ...p, answer: e.target.value }))} rows={3} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={onCancelEdit}>Annuler</Button>
            <Button size="sm" onClick={() => onUpdate(form)}>
              <Save className="w-3.5 h-3.5 mr-1" /> Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:bg-muted/30 transition-colors">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge variant="secondary" className="text-[10px]">{article.category}</Badge>
            {!article.is_published && <Badge variant="outline" className="text-[10px]">Brouillon</Badge>}
          </div>
          <p className="text-sm font-medium truncate">{article.question}</p>
          <p className="text-xs text-muted-foreground truncate">{article.answer}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onEdit}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== Chatbot Editor ====================

const ChatbotEditor = () => {
  const { data: allNodes = [] } = useAllChatbotNodes();
  const { createNode, updateNode, deleteNode } = useChatbotNodeMutations();
  const [showNew, setShowNew] = useState(false);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({ label: '', response_text: '', is_root: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  const rootNodes = allNodes.filter(n => n.is_root);
  const getChildren = (parentId: string) => allNodes.filter(n => n.parent_id === parentId);

  const handleCreate = () => {
    if (!newForm.label.trim()) return;
    createNode.mutate({
      label: newForm.label,
      response_text: newForm.response_text || undefined,
      is_root: newParentId === null,
      parent_id: newParentId,
      display_order: allNodes.length,
    }, {
      onSuccess: () => {
        setShowNew(false);
        setNewForm({ label: '', response_text: '', is_root: true });
        setNewParentId(null);
      },
    });
  };

  const handleAddChild = (parentId: string) => {
    setNewParentId(parentId);
    setNewForm({ label: '', response_text: '', is_root: false });
    setShowNew(true);
  };

  const handleAddRoot = () => {
    setNewParentId(null);
    setNewForm({ label: '', response_text: '', is_root: true });
    setShowNew(true);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rootNodes.length} option(s) racine</p>
        <Button size="sm" onClick={handleAddRoot} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Option racine
        </Button>
      </div>

      {showNew && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              {newParentId ? `Sous-option de: ${allNodes.find(n => n.id === newParentId)?.label}` : 'Nouvelle option racine'}
            </p>
            <div>
              <Label className="text-xs">Label (texte du bouton)</Label>
              <Input value={newForm.label} onChange={(e) => setNewForm(p => ({ ...p, label: e.target.value }))} placeholder="ex: Mon compte" />
            </div>
            <div>
              <Label className="text-xs">Réponse du bot (optionnel)</Label>
              <Textarea value={newForm.response_text} onChange={(e) => setNewForm(p => ({ ...p, response_text: e.target.value }))} rows={2} placeholder="Le texte que le bot affichera..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Annuler</Button>
              <Button size="sm" onClick={handleCreate} disabled={createNode.isPending}>
                <Save className="w-3.5 h-3.5 mr-1" /> Créer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-2">
          {rootNodes.map((node) => (
            <ChatbotNodeTree
              key={node.id}
              node={node}
              getChildren={getChildren}
              onAddChild={handleAddChild}
              onUpdate={(id, updates) => updateNode.mutate({ id, ...updates })}
              onDelete={(id) => deleteNode.mutate(id)}
              editingId={editingId}
              setEditingId={setEditingId}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const ChatbotNodeTree = ({ node, getChildren, onAddChild, onUpdate, onDelete, editingId, setEditingId, depth = 0 }: {
  node: HelpChatbotNode;
  getChildren: (id: string) => HelpChatbotNode[];
  onAddChild: (parentId: string) => void;
  onUpdate: (id: string, updates: Partial<HelpChatbotNode>) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  depth?: number;
}) => {
  const [expanded, setExpanded] = useState(true);
  const children = getChildren(node.id);
  const [editForm, setEditForm] = useState({ label: node.label, response_text: node.response_text || '' });
  const isEditing = editingId === node.id;

  if (isEditing) {
    return (
      <Card className="border-primary/30" style={{ marginLeft: depth * 16 }}>
        <CardContent className="pt-3 space-y-2">
          <div>
            <Label className="text-xs">Label</Label>
            <Input value={editForm.label} onChange={(e) => setEditForm(p => ({ ...p, label: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Réponse</Label>
            <Textarea value={editForm.response_text} onChange={(e) => setEditForm(p => ({ ...p, response_text: e.target.value }))} rows={2} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Annuler</Button>
            <Button size="sm" onClick={() => { onUpdate(node.id, editForm); setEditingId(null); }}>
              <Save className="w-3.5 h-3.5 mr-1" /> Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <Card className="hover:bg-muted/30 transition-colors">
        <CardContent className="py-2.5 px-3 flex items-center gap-2">
          {children.length > 0 ? (
            <button onClick={() => setExpanded(!expanded)} className="p-0.5">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : <div className="w-4" />}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{node.label}</p>
            {node.response_text && (
              <p className="text-xs text-muted-foreground truncate">{node.response_text}</p>
            )}
          </div>

          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onAddChild(node.id)} title="Ajouter sous-option">
              <Plus className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditingId(node.id)}>
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => onDelete(node.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {expanded && children.map((child) => (
        <ChatbotNodeTree
          key={child.id}
          node={child}
          getChildren={getChildren}
          onAddChild={onAddChild}
          onUpdate={onUpdate}
          onDelete={onDelete}
          editingId={editingId}
          setEditingId={setEditingId}
          depth={depth + 1}
        />
      ))}
    </div>
  );
};

export default FAQManagementPanel;

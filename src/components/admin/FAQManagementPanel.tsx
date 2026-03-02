import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Save, X, ChevronRight, ChevronDown, Bot, HelpCircle, MessageSquare, ArrowRight, Eye, CornerDownRight, GripVertical, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  useAllFAQArticles, useFAQMutations,
  useAllChatbotNodes, useChatbotNodeMutations,
  type FAQArticle, type HelpChatbotNode
} from '@/hooks/useFAQ';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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
  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [editingNode, setEditingNode] = useState<HelpChatbotNode | null>(null);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [nodeForm, setNodeForm] = useState({ label: '', response_text: '' });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const rootNodes = useMemo(() => allNodes.filter(n => n.is_root).sort((a, b) => a.display_order - b.display_order), [allNodes]);
  const getChildren = (parentId: string) => allNodes.filter(n => n.parent_id === parentId).sort((a, b) => a.display_order - b.display_order);

  const selectedNode = selectedNodeId ? allNodes.find(n => n.id === selectedNodeId) : null;
  const selectedChildren = selectedNodeId ? getChildren(selectedNodeId) : [];

  // Build breadcrumb path for selected node
  const breadcrumb = useMemo(() => {
    if (!selectedNodeId) return [];
    const path: HelpChatbotNode[] = [];
    let current = allNodes.find(n => n.id === selectedNodeId);
    while (current) {
      path.unshift(current);
      current = current.parent_id ? allNodes.find(n => n.id === current!.parent_id) : undefined;
    }
    return path;
  }, [selectedNodeId, allNodes]);

  const openCreateDialog = (parentId: string | null) => {
    setEditingNode(null);
    setNewParentId(parentId);
    setNodeForm({ label: '', response_text: '' });
    setShowNodeDialog(true);
  };

  const openEditDialog = (node: HelpChatbotNode) => {
    setEditingNode(node);
    setNewParentId(node.parent_id);
    setNodeForm({ label: node.label, response_text: node.response_text || '' });
    setShowNodeDialog(true);
  };

  const handleSaveNode = () => {
    if (!nodeForm.label.trim()) return;
    if (editingNode) {
      updateNode.mutate({ id: editingNode.id, label: nodeForm.label, response_text: nodeForm.response_text || undefined });
    } else {
      createNode.mutate({
        label: nodeForm.label,
        response_text: nodeForm.response_text || undefined,
        is_root: newParentId === null,
        parent_id: newParentId,
        display_order: allNodes.length,
      });
    }
    setShowNodeDialog(false);
  };

  const handleDeleteNode = (id: string) => {
    // Also check if it has children
    const children = getChildren(id);
    if (children.length > 0) {
      if (!confirm(`Ce nœud a ${children.length} sous-option(s). Supprimer quand même ?`)) return;
    }
    deleteNode.mutate(id);
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // The nodes to display in the current view
  const displayNodes = selectedNodeId ? selectedChildren : rootNodes;

  return (
    <div className="space-y-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Arbre de conversation</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowPreview(true)} className="gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Aperçu
          </Button>
          <Button size="sm" onClick={() => openCreateDialog(selectedNodeId)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {selectedNodeId ? 'Sous-option' : 'Option racine'}
          </Button>
        </div>
      </div>

      {/* Breadcrumb navigation */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setSelectedNodeId(null)}
            className="text-xs text-primary hover:underline font-medium"
          >
            🏠 Racine
          </button>
          {breadcrumb.map((node, i) => (
            <div key={node.id} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <button
                onClick={() => setSelectedNodeId(node.id)}
                className={cn(
                  "text-xs font-medium hover:underline",
                  i === breadcrumb.length - 1 ? "text-foreground" : "text-primary"
                )}
              >
                {node.label}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Current node info (when navigated into a node) */}
      {selectedNode && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold">{selectedNode.label}</p>
                </div>
                {selectedNode.response_text ? (
                  <div className="bg-background/80 rounded-xl px-3 py-2 mt-1.5 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-0.5">💬 Réponse du bot :</p>
                    <p className="text-sm text-foreground whitespace-pre-line">{selectedNode.response_text}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-1">Pas de réponse configurée</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => {
                  const parent = selectedNode.parent_id;
                  setSelectedNodeId(parent || null);
                }}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEditDialog(selectedNode)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Options list */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground mb-2">
          {selectedNodeId ? `${selectedChildren.length} option(s) de réponse` : `${rootNodes.length} option(s) racine`}
          {displayNodes.length === 0 && (
            <span className="ml-1 text-amber-500">
              — Nœud terminal (le bouton "Mise en relation" s'affichera ici)
            </span>
          )}
        </p>

        <AnimatePresence mode="popLayout">
          {displayNodes.map((node, index) => {
            const nodeChildren = getChildren(node.id);
            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className={cn(
                  "group transition-all hover:shadow-sm cursor-pointer",
                  "border-border/60 hover:border-primary/30"
                )}>
                  <CardContent className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      {/* Expand / navigate indicator */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          nodeChildren.length > 0
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : "bg-muted text-muted-foreground"
                        )}
                        title={nodeChildren.length > 0 ? `${nodeChildren.length} sous-option(s)` : 'Nœud terminal'}
                      >
                        {nodeChildren.length > 0 ? (
                          <span className="text-xs font-bold">{nodeChildren.length}</span>
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Content */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedNodeId(node.id)}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{node.label}</p>
                          {nodeChildren.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {nodeChildren.length} option{nodeChildren.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {!node.is_active && (
                            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">Inactif</Badge>
                          )}
                        </div>
                        {node.response_text && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            💬 {node.response_text}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={(e) => { e.stopPropagation(); openCreateDialog(node.id); }} title="Ajouter sous-option">
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={(e) => { e.stopPropagation(); openEditDialog(node); }} title="Modifier">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }} title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Navigate arrow */}
                      <ChevronRight
                        className="w-4 h-4 text-muted-foreground shrink-0 cursor-pointer"
                        onClick={() => setSelectedNodeId(node.id)}
                      />
                    </div>

                    {/* Preview of child options */}
                    {nodeChildren.length > 0 && (
                      <div className="mt-2 ml-10 flex flex-wrap gap-1.5">
                        {nodeChildren.slice(0, 4).map(child => (
                          <button
                            key={child.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedNodeId(child.id); }}
                            className="text-[10px] px-2 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            <CornerDownRight className="w-2.5 h-2.5" />
                            {child.label}
                          </button>
                        ))}
                        {nodeChildren.length > 4 && (
                          <span className="text-[10px] px-2 py-1 text-muted-foreground">+{nodeChildren.length - 4} autres</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {displayNodes.length === 0 && !selectedNodeId && (
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucune option configurée</p>
            <p className="text-xs mt-1">Créez des options racine pour construire l'arbre de conversation.</p>
          </div>
        )}

        {displayNodes.length === 0 && selectedNodeId && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Nœud terminal</p>
            <p className="text-xs mt-1 max-w-xs mx-auto">
              Aucune sous-option. Le bouton <span className="text-primary font-medium">"Mise en relation avec un agent"</span> s'affichera automatiquement ici.
            </p>
            <Button size="sm" className="mt-3 gap-1.5" onClick={() => openCreateDialog(selectedNodeId)}>
              <Plus className="w-3.5 h-3.5" />
              Ajouter des options
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Node Dialog */}
      <Dialog open={showNodeDialog} onOpenChange={setShowNodeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              {editingNode ? 'Modifier l\'option' : 'Nouvelle option'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {newParentId && !editingNode && (
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground">
                  Sous-option de : <span className="font-medium text-foreground">{allNodes.find(n => n.id === newParentId)?.label}</span>
                </p>
              </div>
            )}
            <div>
              <Label className="text-xs font-medium">Texte du bouton</Label>
              <Input
                value={nodeForm.label}
                onChange={(e) => setNodeForm(p => ({ ...p, label: e.target.value }))}
                placeholder="ex: Problème de connexion"
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Ce texte apparaît comme option cliquable pour l'utilisateur.</p>
            </div>
            <div>
              <Label className="text-xs font-medium">Réponse du bot (optionnel)</Label>
              <Textarea
                value={nodeForm.response_text}
                onChange={(e) => setNodeForm(p => ({ ...p, response_text: e.target.value }))}
                rows={3}
                placeholder="Le message que le bot affichera quand l'utilisateur clique sur cette option..."
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Laissez vide si cette option sert uniquement de catégorie avec des sous-options.</p>
            </div>

            {/* Preview */}
            <div className="border border-border rounded-xl p-3 bg-muted/30">
              <p className="text-[10px] text-muted-foreground mb-2 font-medium">Aperçu conversation :</p>
              <div className="space-y-2">
                {nodeForm.label && (
                  <div className="flex justify-end">
                    <div className="bg-foreground text-background text-xs px-3 py-2 rounded-2xl rounded-br-md max-w-[70%]">
                      {nodeForm.label}
                    </div>
                  </div>
                )}
                {nodeForm.response_text && (
                  <div className="flex items-end gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center shrink-0">
                      <Bot className="w-3 h-3 text-background" />
                    </div>
                    <div className="bg-background text-foreground text-xs px-3 py-2 rounded-2xl rounded-bl-md max-w-[70%] border border-border">
                      {nodeForm.response_text}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNodeDialog(false)}>Annuler</Button>
            <Button onClick={handleSaveNode} disabled={!nodeForm.label.trim()} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {editingNode ? 'Sauvegarder' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <ChatbotPreviewDialog open={showPreview} onOpenChange={setShowPreview} allNodes={allNodes} />
    </div>
  );
};

// ==================== Chatbot Preview ====================

const ChatbotPreviewDialog = ({ open, onOpenChange, allNodes }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allNodes: HelpChatbotNode[];
}) => {
  const [previewMessages, setPreviewMessages] = useState<Array<{ type: 'bot' | 'user' | 'system'; text: string }>>([]);
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);
  const [nodeHistory, setNodeHistory] = useState<(string | null)[]>([]);

  const rootNodes = allNodes.filter(n => n.is_root && n.is_active).sort((a, b) => a.display_order - b.display_order);
  const getChildren = (parentId: string) => allNodes.filter(n => n.parent_id === parentId && n.is_active).sort((a, b) => a.display_order - b.display_order);
  const currentOptions = previewNodeId ? getChildren(previewNodeId) : rootNodes;

  const resetPreview = () => {
    setPreviewMessages([
      { type: 'bot', text: 'Bonjour ! 👋 Merci de contacter l\'assistance. Nous sommes là pour vous aider.' },
      { type: 'bot', text: 'Comment pouvons-nous vous aider aujourd\'hui ? Sélectionnez une option ci-dessous.' },
    ]);
    setPreviewNodeId(null);
    setNodeHistory([]);
  };

  const handlePreviewSelect = (node: HelpChatbotNode) => {
    const newMessages = [
      ...previewMessages,
      { type: 'user' as const, text: node.label },
    ];
    if (node.response_text) {
      newMessages.push({ type: 'bot' as const, text: node.response_text });
    }
    setPreviewMessages(newMessages);
    setNodeHistory(prev => [...prev, previewNodeId]);
    setPreviewNodeId(node.id);
  };

  const handlePreviewBack = () => {
    if (nodeHistory.length === 0) return;
    const prev = nodeHistory[nodeHistory.length - 1];
    setNodeHistory(h => h.slice(0, -1));
    setPreviewMessages(m => [...m, { type: 'system', text: '↩️ Retour au menu précédent' }]);
    setPreviewNodeId(prev);
  };

  // Initialize on open
  const handleOpenChange = (o: boolean) => {
    if (o) resetPreview();
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden max-h-[85vh]">
        <div className="flex flex-col h-[75vh]">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
            <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center">
              <Bot className="w-4 h-4 text-background" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Aperçu Chatbot</p>
              <p className="text-[11px] text-muted-foreground">Simulation de conversation</p>
            </div>
            <Button variant="ghost" size="sm" onClick={resetPreview} className="text-xs">
              Réinitialiser
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {previewMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-end gap-2",
                  msg.type === 'user' ? 'justify-end' : msg.type === 'system' ? 'justify-center' : 'justify-start'
                )}
              >
                {msg.type === 'system' ? (
                  <div className="bg-muted/60 text-muted-foreground text-[11px] px-3 py-1.5 rounded-full">
                    {msg.text}
                  </div>
                ) : (
                  <>
                    {msg.type === 'bot' && (
                      <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center shrink-0">
                        <Bot className="w-3 h-3 text-background" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                      msg.type === 'user'
                        ? 'bg-foreground text-background rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    )}>
                      <p className="whitespace-pre-line">{msg.text}</p>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Options */}
            {currentOptions.length > 0 && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-background" />
                </div>
                <div className="flex-1 space-y-1 max-w-[80%]">
                  {currentOptions.map(node => (
                    <button
                      key={node.id}
                      onClick={() => handlePreviewSelect(node)}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-xl border border-border bg-background hover:bg-muted transition-colors"
                    >
                      {node.label}
                    </button>
                  ))}
                  {nodeHistory.length > 0 && (
                    <button
                      onClick={handlePreviewBack}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-xl border border-border bg-background hover:bg-muted transition-colors text-muted-foreground flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Revenir en arrière
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Terminal node */}
            {currentOptions.length === 0 && previewMessages.length > 2 && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-background" />
                </div>
                <div className="flex-1 space-y-1 max-w-[80%]">
                  <div className="px-3 py-2 text-xs font-medium rounded-xl border border-primary/30 bg-primary/5 text-primary flex items-center gap-1.5">
                    🎧 Mise en relation avec un agent
                  </div>
                  <button
                    onClick={() => {
                      setNodeHistory([]);
                      setPreviewNodeId(null);
                      setPreviewMessages(m => [
                        ...m,
                        { type: 'system', text: '───────────' },
                        { type: 'bot', text: 'Avez-vous une autre question ?' },
                      ]);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-xl border border-border bg-background hover:bg-muted transition-colors"
                  >
                    Autre demande
                  </button>
                  {nodeHistory.length > 0 && (
                    <button
                      onClick={handlePreviewBack}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-xl border border-border bg-background hover:bg-muted transition-colors text-muted-foreground flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Revenir en arrière
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FAQManagementPanel;

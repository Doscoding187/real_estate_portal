import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Download, 
  Upload, 
  FileCode, 
  Component, 
  Palette, 
  Code, 
  Eye,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  FolderOpen
} from 'lucide-react';

interface LovableComponent {
  id: string;
  name: string;
  type: 'page' | 'component' | 'ui-element';
  code: string;
  description: string;
  status: 'pending' | 'in-progress' | 'review' | 'integrated';
  createdAt: Date;
}

export default function LovableIntegrationHub() {
  const [components, setComponents] = useState<LovableComponent[]>([]);
  const [newComponent, setNewComponent] = useState({
    name: '',
    type: 'component' as 'page' | 'component' | 'ui-element',
    code: '',
    description: ''
  });
  const [activeTab, setActiveTab] = useState('components');

  const addComponent = () => {
    if (!newComponent.name || !newComponent.code) return;
    
    const component: LovableComponent = {
      id: Date.now().toString(),
      name: newComponent.name,
      type: newComponent.type,
      code: newComponent.code,
      description: newComponent.description,
      status: 'pending',
      createdAt: new Date()
    };
    
    setComponents([...components, component]);
    setNewComponent({
      name: '',
      type: 'component',
      code: '',
      description: ''
    });
  };

  const removeComponent = (id: string) => {
    setComponents(components.filter(component => component.id !== id));
  };

  const updateComponentStatus = (id: string, status: LovableComponent['status']) => {
    setComponents(components.map(component => 
      component.id === id ? { ...component, status } : component
    ));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: LovableComponent['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'in-progress': return 'bg-blue-500';
      case 'review': return 'bg-yellow-500';
      case 'integrated': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: LovableComponent['type']) => {
    switch (type) {
      case 'page': return <FileCode className="h-4 w-4" />;
      case 'component': return <Component className="h-4 w-4" />;
      case 'ui-element': return <Palette className="h-4 w-4" />;
      default: return <Code className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Lovable Integration Hub</h1>
            <p className="text-muted-foreground mt-2">
              Manage and integrate UI components from Lovable into your codebase
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <Upload className="h-3 w-3 mr-1" />
            {components.length} Components
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="add">Add New</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
          </TabsList>

          {/* Components List Tab */}
          <TabsContent value="components" className="space-y-6">
            {components.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Component className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No components added yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first component from Lovable to get started
                  </p>
                  <Button onClick={() => setActiveTab('add')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Component
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {components.map((component) => (
                  <Card key={component.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(component.type)}
                          <CardTitle className="text-lg">{component.name}</CardTitle>
                        </div>
                        <Badge 
                          className={`${getStatusColor(component.status)} text-white`}
                        >
                          {component.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {component.description || 'No description provided'}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-muted rounded-full">
                            {component.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Added {component.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyToClipboard(component.code)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Code
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateComponentStatus(component.id, 'in-progress')}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Start Integration
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateComponentStatus(component.id, 'integrated')}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Mark Integrated
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => removeComponent(component.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Add New Component Tab */}
          <TabsContent value="add" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Lovable Component
                </CardTitle>
                <p className="text-muted-foreground">
                  Paste the code from your Lovable component to add it to the integration queue
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="component-name">Component Name</Label>
                  <Input
                    id="component-name"
                    placeholder="e.g., PropertyCard, DashboardPage"
                    value={newComponent.name}
                    onChange={(e) => setNewComponent({...newComponent, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="component-type">Component Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={newComponent.type === 'page' ? 'default' : 'outline'}
                      onClick={() => setNewComponent({...newComponent, type: 'page'})}
                      className="flex items-center gap-2"
                    >
                      <FileCode className="h-4 w-4" />
                      Page
                    </Button>
                    <Button
                      variant={newComponent.type === 'component' ? 'default' : 'outline'}
                      onClick={() => setNewComponent({...newComponent, type: 'component'})}
                      className="flex items-center gap-2"
                    >
                      <Component className="h-4 w-4" />
                      Component
                    </Button>
                    <Button
                      variant={newComponent.type === 'ui-element' ? 'default' : 'outline'}
                      onClick={() => setNewComponent({...newComponent, type: 'ui-element'})}
                      className="flex items-center gap-2"
                    >
                      <Palette className="h-4 w-4" />
                      UI Element
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="component-description">Description</Label>
                  <Input
                    id="component-description"
                    placeholder="Brief description of what this component does"
                    value={newComponent.description}
                    onChange={(e) => setNewComponent({...newComponent, description: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="component-code">Component Code</Label>
                  <Textarea
                    id="component-code"
                    placeholder="Paste the React/TypeScript code from your Lovable component here..."
                    value={newComponent.code}
                    onChange={(e) => setNewComponent({...newComponent, code: e.target.value})}
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setNewComponent({
                        name: '',
                        type: 'component',
                        code: '',
                        description: ''
                      });
                    }}
                  >
                    Clear
                  </Button>
                  <Button 
                    onClick={addComponent}
                    disabled={!newComponent.name || !newComponent.code}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Add to Queue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Instructions Tab */}
          <TabsContent value="instructions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Integration Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">How to Add Components from Lovable</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Open your component in Lovable</li>
                    <li>Copy the entire component code (Ctrl+C / Cmd+C)</li>
                    <li>Switch to the "Add New" tab in this hub</li>
                    <li>Paste the code into the text area</li>
                    <li>Fill in the component name and description</li>
                    <li>Click "Add to Queue"</li>
                  </ol>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">Integration Process</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li><strong>Pending</strong> - Component added but not yet worked on</li>
                    <li><strong>In Progress</strong> - Currently integrating the component</li>
                    <li><strong>Review</strong> - Integration complete, pending review</li>
                    <li><strong>Integrated</strong> - Component successfully added to codebase</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">Best Practices</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>Review component dependencies before integration</li>
                    <li>Ensure consistent styling with existing components</li>
                    <li>Test components in isolation before full integration</li>
                    <li>Update component status as you progress through integration</li>
                    <li>Remove components from this hub once fully integrated</li>
                  </ul>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Important Note
                  </h4>
                  <p className="text-sm">
                    This hub is for staging components only. Actual integration requires 
                    adapting the Lovable code to match your existing codebase structure, 
                    dependencies, and styling system.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
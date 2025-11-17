/* eslint-disable no-undef */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Function to parse components from the text file
function parseComponentsFromFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  // Normalize line endings to handle both Windows and Unix formats
  const normalizedContent = content.replace(/\r\n/g, '\n');
  
  // Split by the delimiter pattern (handle both \n---\n and \n---\r\n)
  const componentSections = normalizedContent.split('\n---\n').filter(section => section.trim() && !section.startsWith('#'));
  
  const components = [];
  
  // Process each section
  for (let i = 0; i < componentSections.length; i++) {
    const section = componentSections[i].trim();
    
    // Skip empty sections
    if (!section) continue;
    
    // Check if this is a component section (contains metadata)
    if (section.startsWith('Name:')) {
      try {
        // Get the next section which should be the code
        const codeSection = componentSections[i + 1];
        
        if (codeSection) {
          // Parse the component metadata
          const lines = section.split('\n');
          const component = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: '',
            type: 'component',
            description: '',
            tags: [],
            code: codeSection.trim(),
            status: 'pending',
            createdAt: new Date()
          };
          
          // Extract metadata
          for (const line of lines) {
            if (line.startsWith('Name:')) {
              component.name = line.substring(5).trim();
            } else if (line.startsWith('Type:')) {
              component.type = line.substring(5).trim();
            } else if (line.startsWith('Description:')) {
              component.description = line.substring(12).trim();
            } else if (line.startsWith('Tags:')) {
              component.tags = line.substring(5).trim().split(',').map(tag => tag.trim()).filter(tag => tag);
            }
          }
          
          components.push(component);
          i++; // Skip the next section since we've processed it as code
        }
      } catch (error) {
        console.error('Error parsing component section:', error);
      }
    }
  }
  
  return components;
}

// Function to generate the updated LovableIntegrationHub.tsx
function generateUpdatedHub(components) {
  // Read the current hub file
  const hubPath = join('client', 'src', 'pages', 'LovableIntegrationHub.tsx');
  let hubContent = readFileSync(hubPath, 'utf8');
  
  // Convert components to the format expected by the hub
  const formattedComponents = components.map(component => {
    return {
      ...component,
      createdAt: component.createdAt.toISOString(),
      tags: component.tags || []
    };
  });
  
  // Find the initial state section and add components
  const initialStateRegex = /const \[components, setComponents\] = useState<LovableComponent\[\]>\(\[\]\);/;
  const newComponentState = `const [components, setComponents] = useState<LovableComponent[]>(${JSON.stringify(formattedComponents, null, 2)});`;
  
  hubContent = hubContent.replace(initialStateRegex, newComponentState);
  
  // Write the updated content back to the file
  writeFileSync(hubPath, hubContent);
  
  console.log(`Successfully added ${components.length} components to the Lovable Integration Hub`);
}

// Main execution
function main() {
  const componentsFilePath = join('client', 'lovable-components.txt');
  
  try {
    const components = parseComponentsFromFile(componentsFilePath);
    console.log(`Found ${components.length} components in the file`);
    
    if (components.length > 0) {
      generateUpdatedHub(components);
    } else {
      console.log('No components found in the file');
    }
  } catch (error) {
    console.error('Error processing components:', error);
  }
}

main();
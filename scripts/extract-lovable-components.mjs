import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

// Function to extract components from the lovable_project.md file
function extractComponentsFromMarkdown(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const components = [];
  
  // Split the content by lines
  const lines = content.split('\n');
  
  // Look for export statements to identify component names
  let currentComponent = null;
  let inComponentCode = false;
  let componentCode = [];
  let componentNames = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for export statements
    if (line.includes('export') && line.includes('{')) {
      // Extract component names from the export statement
      let j = i;
      let exportLine = line;
      
      // Continue reading lines until we find the closing brace
      while (j < lines.length && !exportLine.includes('};')) {
        j++;
        if (j < lines.length) {
          exportLine += ' ' + lines[j].trim();
        }
      }
      
      // Extract component names from the export statement
      const componentMatches = exportLine.match(/export\s*{([^}]+)}/);
      if (componentMatches && componentMatches[1]) {
        componentNames = componentMatches[1]
          .split(',')
          .map(name => name.trim())
          .filter(name => name && name !== 'type' && !name.includes('Primitive'));
      }
      
      // Look for the component implementation code
      if (componentNames.length > 0) {
        // Find the start of the component implementation
        let k = i;
        while (k < lines.length && !lines[k].includes('import')) {
          k++;
        }
        
        // Skip the import statements
        while (k < lines.length && lines[k].includes('import')) {
          // Skip multi-line imports
          while (k < lines.length && !lines[k].includes(';')) {
            k++;
          }
          k++;
        }
        
        // Now we should be at the component implementation
        let componentStart = k;
        let componentEnd = k;
        
        // Find the end of this component section (next export statement or end of file)
        while (componentEnd < lines.length && !lines[componentEnd].includes('export')) {
          componentEnd++;
        }
        
        // Extract the component code
        if (componentEnd > componentStart) {
          const codeLines = lines.slice(componentStart, componentEnd);
          const code = codeLines.join('\n');
          
          // Create a component entry for each exported component
          for (const componentName of componentNames) {
            if (componentName && !componentName.includes('Primitive')) {
              components.push({
                name: componentName,
                type: 'ui-element',
                description: `UI component extracted from Lovable project`,
                tags: 'lovable,ui,component',
                code: code
              });
            }
          }
        }
      }
      
      // Skip to the next section
      i = j;
    }
  }
  
  return components;
}

// Function to add components to the lovable-components.txt file
function addComponentsToQueue(components) {
  const queueFilePath = join('client', 'lovable-components.txt');
  
  // Add each component to the queue file
  for (const component of components) {
    const componentEntry = `
---
Name: ${component.name}
Type: ${component.type}
Description: ${component.description}
Tags: ${component.tags}
---
${component.code}
---
`;
    
    appendFileSync(queueFilePath, componentEntry);
    console.log(`Added ${component.name} to the components queue`);
  }
  
  console.log(`Successfully added ${components.length} components to the Lovable components queue`);
}

// Main execution
function main() {
  const markdownFilePath = join('client', 'src', 'pages', 'lovable_project.md');
  
  try {
    const components = extractComponentsFromMarkdown(markdownFilePath);
    console.log(`Found ${components.length} components in the Lovable project file`);
    
    if (components.length > 0) {
      addComponentsToQueue(components);
    } else {
      console.log('No components found in the Lovable project file');
    }
  } catch (error) {
    console.error('Error processing Lovable components:', error);
  }
}

main();
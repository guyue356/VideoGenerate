import { askLLM } from '../llm/client.js';

export async function discoverFeatures(repoProfile) {
  const systemPrompt = `You are a technical product analyst. Your job is to discover the REAL core capabilities and user value of a software project — not just what the README says, but what the code actually reveals.

Rules:
- Do NOT just restate the README. Analyze the code snippets, dependencies, and file structure.
- Focus on what makes this project genuinely useful or interesting to users.
- Identify surprising features that aren't obvious from the project name.
- Position the project relative to alternatives.`;

  const userPrompt = `Analyze this project and discover its true capabilities.

## Project Info
Name: ${repoProfile.name}
Type: ${repoProfile.type}
Language: ${repoProfile.language}
Tagline: ${repoProfile.tagline || 'N/A'}
Description: ${repoProfile.description || 'N/A'}
Entry Point: ${repoProfile.entry_point}

## Tech Stack
${repoProfile.tech_stack.map(t => `- ${t.name} (${t.source})`).join('\n')}

## File Structure
Total files: ${repoProfile.file_structure.total_files}
Single file app: ${repoProfile.file_structure.single_file_app}
Key files: ${repoProfile.file_structure.key_files.join(', ')}

## README Excerpt
${repoProfile.readme_excerpt || 'No README found'}

## Code Snippets (from actual source code)
${repoProfile.code_snippets.map(s =>
  `### ${s.file} (lines ${s.lines}) — ${s.significance}\n\`\`\`\n${s.content}\n\`\`\``
).join('\n\n')}

Respond in JSON:
{
  "core_capabilities": [
    { "capability": "what it can do", "evidence": "from the code/dependencies", "confidence": "high|medium|low" }
  ],
  "likely_user_value": ["value 1", "value 2", "value 3"],
  "surprising_features": ["unexpected feature 1", "unexpected feature 2"],
  "positioning": {
    "category": "what category this belongs to",
    "compares_to": ["alternative 1", "alternative 2"],
    "edge": "what makes this different"
  }
}`;

  try {
    return await askLLM({ systemPrompt, userPrompt, agent: 'Feature Discovery' });
  } catch (err) {
    // Fallback: generate a basic discovery from repo profile
    return {
      core_capabilities: repoProfile.code_snippets.map(s => ({
        capability: s.significance,
        evidence: `Code in ${s.file}`,
        confidence: 'medium',
      })),
      likely_user_value: [repoProfile.tagline || repoProfile.description || 'Useful tool'],
      surprising_features: [],
      positioning: {
        category: repoProfile.type,
        compares_to: [],
        edge: 'Open source',
      },
    };
  }
}

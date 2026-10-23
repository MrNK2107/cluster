import type { BoardDocument } from '../types';

export function documentToMarkdown(doc: BoardDocument): string {
  let md = `# ${doc.title}\n\n`;
  if (doc.description) {
    md += `> ${doc.description}\n\n`;
  }

  // First group by clusters
  const clusterMap = new Map<string, typeof doc.cards>();
  const floatingCards: typeof doc.cards = [];

  for (const card of doc.cards) {
    if (card.clusterId) {
      if (!clusterMap.has(card.clusterId)) {
        clusterMap.set(card.clusterId, []);
      }
      clusterMap.get(card.clusterId)!.push(card);
    } else {
      floatingCards.push(card);
    }
  }

  // Print clusters
  for (const cluster of doc.clusters) {
    md += `## 📦 Cluster: ${cluster.title}\n\n`;
    const cards = clusterMap.get(cluster.id) || [];
    if (cards.length === 0) {
      md += `*(Empty cluster)*\n\n`;
    } else {
      for (const card of cards) {
        md += formatCardMarkdown(card);
      }
    }
    md += `---\n\n`;
  }

  // Print floating cards
  if (floatingCards.length > 0) {
    md += `## 📌 Floating Notes & Todos\n\n`;
    for (const card of floatingCards) {
      md += formatCardMarkdown(card);
    }
  }

  return md;
}

function formatCardMarkdown(card: any): string {
  let md = `### ${card.title} [${card.type.toUpperCase()}]\n`;
  if (card.tags && card.tags.length > 0) {
    md += `Tags: ${card.tags.join(' ')}\n\n`;
  } else {
    md += `\n`;
  }

  if (card.type === 'todo' && card.todos) {
    for (const item of card.todos) {
      const mark = item.completed ? '[x]' : '[ ]';
      const prio = item.priority ? `(${item.priority}) ` : '';
      md += `- ${mark} ${prio}${item.text}\n`;
    }
    md += `\n`;
  } else if ((card.type === 'note' || card.type === 'sticky') && card.noteContent) {
    md += `${card.noteContent}\n\n`;
  } else if (card.type === 'counter') {
    md += `**${card.counterLabel || 'Counter'}:** ${card.counterValue || 0}\n\n`;
  } else if (card.type === 'links' && card.bookmarks) {
    for (const bm of card.bookmarks) {
      md += `- [${bm.title}](${bm.url})\n`;
    }
    md += `\n`;
  }

  return md;
}

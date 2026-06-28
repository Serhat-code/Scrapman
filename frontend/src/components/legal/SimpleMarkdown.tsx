import type { ReactNode } from "react";

// Rendu minimal, sans dépendance, du sous-ensemble Markdown utilisé par les
// documents légaux (titres #/##/###, gras **texte**, listes -/1., tableaux
// |a|b|, séparateurs ---, liens [texte](url)). Pas un parseur Markdown
// complet — volontairement limité à ce que ces documents utilisent.

function renderInline(texte: string, cle: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let i = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(texte))) {
    if (match.index > lastIndex) nodes.push(texte.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={`${cle}-${i++}`}>{match[1]}</strong>);
    } else {
      nodes.push(
        <a
          key={`${cle}-${i++}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--emerald-light)] hover:underline"
        >
          {match[2]}
        </a>
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < texte.length) nodes.push(texte.slice(lastIndex));
  return nodes;
}

function renderParagrapheLignes(lignes: string[], cle: string): ReactNode {
  return (
    <p key={cle} className="text-sm leading-relaxed text-[var(--text-secondary)]">
      {lignes.map((ligne, idx) => (
        <span key={idx}>
          {renderInline(ligne.replace(/\s+$/, ""), `${cle}-${idx}`)}
          {idx < lignes.length - 1 && <br />}
        </span>
      ))}
    </p>
  );
}

export function SimpleMarkdown({ contenu }: { contenu: string }) {
  const lignes = contenu.split("\n");
  const blocs: ReactNode[] = [];
  let i = 0;
  let cle = 0;

  while (i < lignes.length) {
    const ligne = lignes[i];

    if (ligne.trim() === "") {
      i++;
      continue;
    }

    if (ligne.trim() === "---") {
      blocs.push(<hr key={cle++} className="my-4 border-[var(--border)]" />);
      i++;
      continue;
    }

    const headerMatch = ligne.match(/^(#{1,3})\s+(.*)$/);
    if (headerMatch) {
      const niveau = headerMatch[1].length;
      const texte = headerMatch[2];
      const classes =
        niveau === 1
          ? "mt-6 text-lg font-semibold text-[var(--text-primary)]"
          : niveau === 2
            ? "mt-5 text-base font-semibold text-[var(--text-primary)]"
            : "mt-4 text-sm font-semibold text-[var(--text-primary)]";
      const Tag = niveau === 1 ? "h1" : niveau === 2 ? "h2" : "h3";
      blocs.push(
        <Tag key={cle++} className={classes}>
          {renderInline(texte, `h-${cle}`)}
        </Tag>
      );
      i++;
      continue;
    }

    if (ligne.trim().startsWith("|")) {
      const tableLignes: string[] = [];
      while (i < lignes.length && lignes[i].trim().startsWith("|")) {
        tableLignes.push(lignes[i]);
        i++;
      }
      const rows = tableLignes
        .map((l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()))
        .filter((cells, idx) => !(idx === 1 && cells.every((c) => /^-+$/.test(c))));
      const [header, ...body] = rows;
      blocs.push(
        <table key={cle++} className="my-3 w-full border-collapse text-sm">
          <thead>
            <tr>
              {header.map((cell, idx) => (
                <th
                  key={idx}
                  className="border border-[var(--border)] px-2 py-1.5 text-left font-semibold text-[var(--text-primary)]"
                >
                  {renderInline(cell, `th-${cle}-${idx}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ridx) => (
              <tr key={ridx}>
                {row.map((cell, cidx) => (
                  <td key={cidx} className="border border-[var(--border)] px-2 py-1.5 text-[var(--text-secondary)]">
                    {renderInline(cell, `td-${cle}-${ridx}-${cidx}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      continue;
    }

    const listMatch = ligne.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const ordonnee = /^\d+\.$/.test(listMatch[2]);
      const items: string[] = [];
      while (i < lignes.length) {
        const m = lignes[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        if (!m) break;
        items.push(m[3]);
        i++;
      }
      const ListTag = ordonnee ? "ol" : "ul";
      blocs.push(
        <ListTag
          key={cle++}
          className={`my-2 flex flex-col gap-1 pl-5 text-sm text-[var(--text-secondary)] ${
            ordonnee ? "list-decimal" : "list-disc"
          }`}
        >
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `li-${cle}-${idx}`)}</li>
          ))}
        </ListTag>
      );
      continue;
    }

    // Paragraphe : accumule les lignes consécutives non vides.
    const paragrapheLignes: string[] = [];
    while (i < lignes.length && lignes[i].trim() !== "" && !lignes[i].match(/^(#{1,3})\s|^---$|^\s*[-*]\s|^\s*\d+\.\s|^\s*\|/)) {
      paragrapheLignes.push(lignes[i]);
      i++;
    }
    if (paragrapheLignes.length > 0) {
      blocs.push(renderParagrapheLignes(paragrapheLignes, `p-${cle++}`));
    } else {
      i++;
    }
  }

  return <div className="flex flex-col gap-1">{blocs}</div>;
}

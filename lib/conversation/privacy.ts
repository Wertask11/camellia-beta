/** Mask names already known from local profile/tree data before any Gemini request. */
export function redactKnownNames(value: string, knownNames: string[]) {
  return [...new Set(knownNames.map((name) => name.trim()).filter((name) => name.length >= 1))]
    .sort((a, b) => b.length - a.length)
    .reduce((text, name) => text.replaceAll(name, '[名前]'), value);
}

/** Never re-export local replies: they may have quoted private records. */
export function geminiHistory(messages: Array<{ role: 'user' | 'assistant' | 'system'; text: string; provider?: string }>) {
  const pairs:Array<Array<{role:'user'|'assistant';text:string}>>=[];
  // Read only the recent completed Gemini pairs, never scan/copy the whole Library history.
  for(let i=messages.length-1;i>=0&&pairs.length<4;i--){
    const current=messages[i];if(current.role!=='assistant'||current.provider!=='gemini')continue;
    let before=i-1;while(before>=0&&messages[before].role==='system')before--;
    if(before>=0&&messages[before].role==='user')pairs.push([{role:'user',text:messages[before].text},{role:'assistant',text:current.text}]);
  }
  return pairs.reverse().flat();
}


var dragAndDrop = ll => () => {
  
  var maintainer = el => {
    ll.forEach(lli => lli.installation = re.install(lli.value));
    ll.onInsert(lli => lli.installation = re.install(lli.value, lli.itemAfter ? lli.itemAfter.value : undefined));
    ll.onRemove(lli => lli.installation.remove());
  };
  
  return bundle
    `<div ${maintainer}} />`;
};

/* Уже созданные вымышленные фото макета. Новая генерация недоступна;
   восемь портретов переиспользуются, парные снимки разделяются только CSS. */
window.SearchDemoPortraits = (() => {
  'use strict';
  const men = [
    {src:'assets/candidates/portrait-sergey.png?public=6e05742eaa85'},
    {src:'assets/candidates/portraits-men.png?public=e60a368f5364',side:0},
    {src:'assets/candidates/portraits-men.png?public=e60a368f5364',side:1},
    {src:'assets/candidates/portraits-pair.png?public=a88328ab2b7b',side:0}
  ];
  const women = [
    {src:'assets/candidates/portrait-alina.png?public=50e5ee365cc3'},
    {src:'assets/candidates/portrait-olga.png?public=d33ffe5500c6'},
    {src:'assets/candidates/portrait-ekaterina.png?public=46b4c9f9450d'},
    {src:'assets/candidates/portraits-pair.png?public=a88328ab2b7b',side:1}
  ];
  function style(index) {
    if (!Number.isInteger(index) || index < 0 || index >= 72) return '';
    const column=index%12, serial=Math.floor(index/12)*6+column%6;
    const photo=(column<6 ? men : women)[serial%4];
    return `background-image:url("${photo.src}");background-size:${photo.side===undefined ? 'cover' : '200% 100%'};background-position:${photo.side===undefined ? 'center' : photo.side ? '100% 50%' : '0% 50%'};`;
  }
  return {style};
})();

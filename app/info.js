(() => {
  const RAW_CATALOG = 'https://raw.githubusercontent.com/henmario99-art/HAKI/main/productos.js';
  const path = location.pathname.toLowerCase();
  const key = path.includes('encomiendas') ? 'encomiendas' : path.includes('domicilios') ? 'domicilios' : 'cambios';
  const fallbackTitles = { encomiendas: 'ENCOMIENDAS', domicilios: 'DOMICILIOS', cambios: 'CAMBIOS' };

  function parseConfig(source) {
    const match = source.match(/window\.HAKI_CONFIG\s*=\s*(\{[\s\S]*?\});/);
    if (!match) throw new Error('No se encontró la configuración');
    return JSON.parse(match[1]);
  }

  function resolveImage(url = '') {
    const value = String(url || '').trim();
    if (!value) return '';
    if (/^(https?:|data:|blob:)/i.test(value)) return value;
    return value.replace(/^\/?(?:\.\/)?/, '');
  }

  function render(section) {
    if (!section) return;
    const hasContent = String(section.texto || '').trim() || (Array.isArray(section.imagenes) && section.imagenes.length);
    if (!hasContent) return;

    const main = document.querySelector('.info-main');
    if (!main) return;
    const title = String(section.titulo || fallbackTitles[key]).trim() || fallbackTitles[key];
    document.title = `${title} — HAKI`;
    main.replaceChildren();

    const eyebrow = document.createElement('p');
    eyebrow.className = 'info-eyebrow';
    eyebrow.textContent = 'INFORMACIÓN HAKI';

    const heading = document.createElement('h1');
    heading.textContent = title;

    const block = document.createElement('section');
    block.className = 'info-block info-richtext';
    const paragraphs = String(section.texto || '').split(/\n\s*\n/).map(v => v.trim()).filter(Boolean);
    paragraphs.forEach(text => {
      const p = document.createElement('p');
      p.textContent = text;
      block.append(p);
    });
    if (!paragraphs.length) block.hidden = true;

    main.append(eyebrow, heading, block);

    const images = Array.isArray(section.imagenes) ? section.imagenes.filter(Boolean) : [];
    if (images.length) {
      const gallery = document.createElement('div');
      gallery.className = 'info-gallery';
      images.forEach((url, index) => {
        const img = document.createElement('img');
        img.src = window.hakiImage(url,1400);
        img.alt = `${title} · imagen ${index + 1}`;
        img.loading = index ? 'lazy' : 'eager';
        gallery.append(img);
      });
      main.append(gallery);
    }
  }

  function update(){
    const config=window.hakiSettings(window.HAKI_CONFIG||{});
    document.documentElement.dataset.theme=config.tema==='oscuro'?'oscuro':'claro';
    document.documentElement.style.setProperty('--font-title',config.fuenteTitulos==='Horizon'?'Horizon,Poppins,sans-serif':'Poppins,sans-serif');
    document.documentElement.style.setProperty('--font-body',config.fuenteTexto==='Horizon'?'Horizon,Poppins,sans-serif':'Poppins,sans-serif');
    if(config.horizonUrl){const font=new FontFace('Horizon',`url(${JSON.stringify(window.hakiSafeLink(config.horizonUrl,''))})`,{display:'swap'});font.load().then(f=>document.fonts.add(f)).catch(()=>{});}
    render(config.informacion?.[key]);
  }
  window.addEventListener('haki:catalog-updated',update);update();
})();

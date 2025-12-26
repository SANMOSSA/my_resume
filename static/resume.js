(function(){
  const bundle = window.resumeBundle || {};
  const languages = bundle.languages || {};
  let activeLang = bundle.defaultLanguage || Object.keys(languages)[0];
  if(!activeLang) return;

  function getLangData(code){
    return languages[code] || languages[bundle.defaultLanguage] || Object.values(languages)[0];
  }

  function buildEducation(data){
    return (data.education || []).map(entry => ({
      ...entry,
      status: entry.status || ''
    }));
  }

  function buildState(code){
    const langData = getLangData(code);
    if(!langData) return null;
    return {
      lang: code,
      data: langData,
      education: buildEducation(langData)
    };
  }

  let state = buildState(activeLang);
  if(!state) return;

  function csvEscape(value){
    if(value === null || value === undefined) return '""';
    const s = String(value);
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function generateCSV(langData){
    const headers = ['section','title','subtitle','start','end','location','content','bullets','image','level','category'];
    const lines = [];
    lines.push(headers.map(csvEscape).join(','));

    lines.push([
      csvEscape('profile'),
      csvEscape(langData.name),
      csvEscape(langData.title),
      csvEscape(''),
      csvEscape(''),
      csvEscape(''),
      csvEscape(`${langData.email} | ${langData.website}`),
      csvEscape(''),
      csvEscape(''),
      csvEscape(''),
      csvEscape('')
    ].join(','));

    (langData.experiences || []).forEach(exp => {
      const bulletsJson = JSON.stringify(exp.bullets || []);
      lines.push([
        csvEscape('experience'),
        csvEscape(exp.company),
        csvEscape(exp.role),
        csvEscape(exp.start),
        csvEscape(exp.end),
        csvEscape(exp.location),
        csvEscape(exp.description),
        csvEscape(bulletsJson),
        csvEscape(exp.image || ''),
        csvEscape(''),
        csvEscape('')
      ].join(','));
    });

    (langData.education || []).forEach(ed => {
      lines.push([
        csvEscape('education'),
        csvEscape(ed.institution),
        csvEscape(ed.degree),
        csvEscape(ed.start),
        csvEscape(ed.end),
        csvEscape(''),
        csvEscape(''),
        csvEscape(JSON.stringify(ed.courses || [])),
        csvEscape(''),
        csvEscape(''),
        csvEscape('')
      ].join(','));
    });

    (langData.skills || []).forEach(cat => {
      (cat.items || []).forEach(it => {
        lines.push([
          csvEscape('skill'),
          csvEscape(it.name),
          csvEscape(''),
          csvEscape(''),
          csvEscape(''),
          csvEscape(''),
          csvEscape(''),
          csvEscape(''),
          csvEscape(it.image || ''),
          csvEscape(it.level !== undefined ? it.level : ''),
          csvEscape(cat.category || '')
        ].join(','));
      });
    });

    return lines.join('\n');
  }

  function setFlagClass(code){
    return code.startsWith('es') ? 'flag-es' : 'flag-en';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const langToggle = document.getElementById('langToggle');
    const langMenu = document.getElementById('langMenu');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    const contactSection = document.getElementById('contactSection');
    const summaryText = document.getElementById('summaryText');
    const experienceSection = document.getElementById('experienceSection');
    const educationSection = document.getElementById('educationSection');
    const skillsSection = document.getElementById('skillsSection');
    const experienceTitle = document.getElementById('experienceTitle');
    const educationTitle = document.getElementById('educationTitle');
    const skillsTitle = document.getElementById('skillsTitle');
    const visualNotePrefix = document.getElementById('visualNotePrefix');
    const visualNoteLink = document.getElementById('visualNoteLink');
    const themeSun = themeToggle.querySelector('.sun');
    const themeMoon = themeToggle.querySelector('.moon');

    function renderLanguage(nextState){
      state = nextState;
      const langData = state.data;
      document.querySelector('.name').textContent = langData.name;
      document.querySelector('.role').textContent = langData.title;

      contactSection.innerHTML = '';
      const emailLink = document.createElement('a');
      emailLink.href = `mailto:${langData.email}`;
      emailLink.className = 'muted';
      emailLink.textContent = langData.email;
      contactSection.appendChild(emailLink);

      if(langData.website){
        const sep = document.createElement('span');
        sep.className = 'sep';
        sep.textContent = '•';
        contactSection.appendChild(sep);

        const websiteLink = document.createElement('a');
        websiteLink.href = langData.website;
        websiteLink.target = '_blank';
        websiteLink.rel = 'noopener';
        websiteLink.className = 'muted';
        websiteLink.textContent = langData.website.replace(/^https?:\/\//,'');
        contactSection.appendChild(websiteLink);
      }

      (langData.social || []).forEach(item => {
        if(!item.url) return;
        const sep = document.createElement('span');
        sep.className = 'sep';
        sep.textContent = '•';
        contactSection.appendChild(sep);

        const link = document.createElement('a');
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'muted';
        link.textContent = item.network;
        contactSection.appendChild(link);
      });

      summaryText.textContent = langData.summary;

      experienceTitle.textContent = langData.labels.experience;
      educationTitle.textContent = langData.labels.education;
      skillsTitle.textContent = langData.labels.skills;
      visualNotePrefix.textContent = langData.labels.visual_note_prefix;
      visualNoteLink.textContent = langData.labels.visual_note_link;
      visualNoteLink.href = langData.labels.visual_note_href || visualNoteLink.href;
      langToggle.querySelector('.toggle-label').textContent = langData.labels.language_name;
      langToggle.setAttribute('aria-label', langData.labels.language_toggle);
      themeToggle.querySelector('.sr-only').textContent = langData.labels.theme_toggle;

      experienceSection.innerHTML = '';
      (langData.experiences || []).forEach(exp => {
        const article = document.createElement('article');
        article.className = 'job';
        const logoMarkup = exp.image
          ? `<img class="job-logo" src="${bundle.staticBase}${exp.image}" alt="${exp.company} logo">`
          : `<span class="icon material-icons">${exp.icon || 'work'}</span>`;
        article.innerHTML = `
          <div class="job-left">
            <div class="job-head">
              ${logoMarkup}
              <div>
                <div class="company">${exp.company}</div>
                <div class="position">${exp.role}</div>
              </div>
            </div>
            <p class="job-desc">${exp.description}</p>
            <ul class="bullets">
              ${(exp.bullets || []).map(b => `<li><span class="material-icons">${b.icon}</span>${b.item}</li>`).join('')}
            </ul>
          </div>
          <div class="job-right">
            <div class="dates">${exp.start} — ${exp.end}</div>
            <div class="location">${exp.location || ''}</div>
          </div>
        `;
        experienceSection.appendChild(article);
      });

      educationSection.innerHTML = '';
      (langData.education || []).forEach(ed => {
        const wrapper = document.createElement('div');
        wrapper.className = 'edu';
        wrapper.innerHTML = `
          <div class="edu-left">
            <div class="institution">${ed.institution}</div>
            <div class="degree">${ed.degree}</div>
          </div>
          <div class="edu-right">
            <div class="dates">${ed.start} — ${ed.end}</div>
            ${ed.status ? `<div class="status muted">${ed.status}</div>` : ''}
          </div>
        `;
        educationSection.appendChild(wrapper);
      });

      skillsSection.innerHTML = '';
      (langData.skills || []).forEach(cat => {
        const block = document.createElement('div');
        block.className = 'skill-block';
        const items = (cat.items || []).map(item => {
          const level = Math.min(10, Math.max(1, item.level || 0));
          const width = Math.round((item.level || 0) / 10 * 100);
          return `
            <div class="skill">
              <div class="skill-meta">
                <div class="label">
                  ${item.image ? `<img class="skill-icon" src="${bundle.staticBase}${item.image}" alt="${item.name}">` : ''}
                  <div class="skill-name">${item.name}</div>
                </div>
                <div class="skill-level">${item.level}/10</div>
              </div>
              <div class="bar" aria-hidden="true">
                <div class="fill lvl-${level}" style="width:${width}%"></div>
              </div>
            </div>
          `;
        }).join('');
        block.innerHTML = `<h3 class="skill-category">${cat.category}</h3>${items}`;
        skillsSection.appendChild(block);
      });

      const langButtons = langMenu.querySelectorAll('.dropdown-item');
      langButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === state.lang);
      });

      const flagEl = langToggle.querySelector('.flag-current');
      flagEl.classList.remove('flag-es', 'flag-en');
      flagEl.classList.add(setFlagClass(state.lang));
    }

    renderLanguage(state);
    langToggle.addEventListener('click', () => {
      const expanded = langToggle.getAttribute('aria-expanded') === 'true';
      langToggle.setAttribute('aria-expanded', (!expanded).toString());
      langMenu.classList.toggle('open', !expanded);
    });

    langMenu.addEventListener('click', (event) => {
      const target = event.target.closest('.dropdown-item');
      if(!target) return;
      const code = target.dataset.lang;
      if(!code || code === state.lang) return;
      const nextState = buildState(code);
      if(!nextState) return;
      renderLanguage(nextState);
      langToggle.setAttribute('aria-expanded', 'false');
      langMenu.classList.remove('open');
    });

    document.addEventListener('click', event => {
      if(!langMenu.contains(event.target) && !langToggle.contains(event.target)){
        langMenu.classList.remove('open');
        langToggle.setAttribute('aria-expanded', 'false');
      }
    });

    const storedTheme = window.localStorage.getItem('resume-theme');
    if(storedTheme === 'light' || storedTheme === 'dark'){
      body.dataset.theme = storedTheme;
      themeToggle.setAttribute('aria-pressed', storedTheme === 'light');
    }
    themeSun.style.display = body.dataset.theme === 'light' ? 'inline-flex' : 'none';
    themeMoon.style.display = body.dataset.theme === 'light' ? 'none' : 'inline-flex';

    themeToggle.addEventListener('click', () => {
      const isLight = body.dataset.theme === 'light';
      body.dataset.theme = isLight ? 'dark' : 'light';
      themeToggle.setAttribute('aria-pressed', (!isLight).toString());
      window.localStorage.setItem('resume-theme', body.dataset.theme);
      themeSun.style.display = body.dataset.theme === 'light' ? 'inline-flex' : 'none';
      themeMoon.style.display = body.dataset.theme === 'light' ? 'none' : 'inline-flex';
    });

  });
})();

(function(){
  const bundle = window.resumeBundle || {};
  const dataset = bundle.data || {};
  const rawLanguages = bundle.languages || dataset.languages || [];
  const defaultLanguage = bundle.defaultLanguage || dataset.default_language || rawLanguages[0] || 'es';
  const localeList = rawLanguages.length ? rawLanguages : [defaultLanguage];
  const languageLabels = bundle.languageLabels || {};
  const staticBase = bundle.staticBase || '';

  function isTranslationObject(value){
    if(!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    if(!keys.length) return false;
    return keys.every(key => localeList.includes(key));
  }

  function translateNode(node, lang){
    if(Array.isArray(node)){
      return node.map(item => translateNode(item, lang));
    }
    if(node && typeof node === 'object'){
      if(isTranslationObject(node)){
        const order = [lang, defaultLanguage, localeList[0]].filter(Boolean);
        for(const code of order){
          if(node[code] !== undefined){
            return translateNode(node[code], lang);
          }
        }
        const fallbackKey = Object.keys(node)[0];
        return translateNode(node[fallbackKey], lang);
      }
      const result = {};
      for(const [key, value] of Object.entries(node)){
        result[key] = translateNode(value, lang);
      }
      return result;
    }
    return node;
  }

  function buildState(lang){
    return {
      lang,
      data: translateNode(dataset, lang)
    };
  }

  function setFlagClass(code){
    if(!code) return 'flag-en';
    if(code.toLowerCase().startsWith('es')) return 'flag-es';
    if(code.toLowerCase().startsWith('en')) return 'flag-en';
    return 'flag-en';
  }

  let state = null;
  const dom = {};

  document.addEventListener('DOMContentLoaded', () => {
    dom.name = document.querySelector('.name');
    dom.role = document.querySelector('.role');
    dom.contact = document.getElementById('contactSection');
    dom.summary = document.getElementById('summaryText');
    dom.experienceTitle = document.getElementById('experienceTitle');
    dom.educationTitle = document.getElementById('educationTitle');
    dom.skillsTitle = document.getElementById('skillsTitle');
    dom.experienceSection = document.getElementById('experienceSection');
    dom.educationSection = document.getElementById('educationSection');
    dom.skillsSection = document.getElementById('skillsSection');
    dom.visualNotePrefix = document.getElementById('visualNotePrefix');
    dom.visualNoteLink = document.getElementById('visualNoteLink');
    dom.langToggle = document.getElementById('langToggle');
    dom.langMenu = document.getElementById('langMenu');
    dom.themeToggle = document.getElementById('themeToggle');
    dom.themeSun = dom.themeToggle ? dom.themeToggle.querySelector('.sun') : null;
    dom.themeMoon = dom.themeToggle ? dom.themeToggle.querySelector('.moon') : null;
    dom.body = document.body;

    state = buildState(defaultLanguage);
    renderLanguage();
    setupLanguageEvents();
    setupThemeToggle();
  });

  function renderLanguage(){
    if(!state) return;
    const langData = state.data || {};
    const profile = langData.profile || {};
    const labels = langData.labels || {};

    if(dom.name) dom.name.textContent = profile.name || '';
    if(dom.role) dom.role.textContent = profile.title || '';

    if(dom.contact){
      dom.contact.innerHTML = '';
      if(profile.email){
        const emailLink = document.createElement('a');
        emailLink.href = `mailto:${profile.email}`;
        emailLink.className = 'muted';
        emailLink.textContent = profile.email;
        dom.contact.appendChild(emailLink);
      }
      const website = profile.website;
      if(website){
        if(dom.contact.children.length){
          const sep = document.createElement('span');
          sep.className = 'sep';
          sep.textContent = '•';
          dom.contact.appendChild(sep);
        }
        const websiteLink = document.createElement('a');
        websiteLink.href = website;
        websiteLink.target = '_blank';
        websiteLink.rel = 'noopener';
        websiteLink.className = 'muted';
        websiteLink.textContent = website.replace(/^https?:\/\//, '');
        dom.contact.appendChild(websiteLink);
      }
      (langData.social || []).forEach(item => {
        if(!item.url) return;
        if(dom.contact.children.length){
          const sep = document.createElement('span');
          sep.className = 'sep';
          sep.textContent = '•';
          dom.contact.appendChild(sep);
        }
        const link = document.createElement('a');
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'muted';
        link.textContent = item.handle || item.network;
        dom.contact.appendChild(link);
      });
    }

    if(dom.summary) dom.summary.textContent = profile.summary || '';
    if(dom.experienceTitle) dom.experienceTitle.textContent = labels.experience || '';
    if(dom.educationTitle) dom.educationTitle.textContent = labels.education || '';
    if(dom.skillsTitle) dom.skillsTitle.textContent = labels.skills || '';

    renderExperiences(langData.experiences || []);
    renderEducation(langData.education || []);
    renderSkills(langData.skills || []);

    if(dom.visualNotePrefix) dom.visualNotePrefix.textContent = labels.visual_note_prefix || '';
    if(dom.visualNoteLink){
      dom.visualNoteLink.textContent = labels.visual_note_link || '';
      if(labels.visual_note_href){
        dom.visualNoteLink.href = labels.visual_note_href;
      }
    }

    if(dom.langToggle){
      const labelEl = dom.langToggle.querySelector('.toggle-label');
      if(labelEl) labelEl.textContent = labels.language_name || state.lang.toUpperCase();
      dom.langToggle.setAttribute('aria-label', labels.language_toggle || '');
      const flagEl = dom.langToggle.querySelector('.flag-current');
      if(flagEl){
        flagEl.classList.remove('flag-es', 'flag-en');
        flagEl.classList.add(setFlagClass(state.lang));
      }
    }

    if(dom.themeToggle){
      const srOnly = dom.themeToggle.querySelector('.sr-only');
      if(srOnly) srOnly.textContent = labels.theme_toggle || srOnly.textContent;
    }

    updateLanguageMenuState();
  }

  function renderExperiences(experiences){
    if(!dom.experienceSection) return;
    dom.experienceSection.innerHTML = '';
    experiences.forEach(exp => {
      const article = document.createElement('article');
      article.className = 'job';
      const logoMarkup = exp.image
        ? `<img class="job-logo" src="${staticBase}${exp.image}" alt="${exp.company} logo">`
        : `<span class="icon material-icons">${exp.icon || 'work'}</span>`;
      const bullets = (exp.bullets || []).map(b => `<li><span class="material-icons">${b.icon}</span>${b.item}</li>`).join('');
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
          <ul class="bullets">${bullets}</ul>
        </div>
        <div class="job-right">
          <div class="dates">${exp.start} — ${exp.end}</div>
          <div class="location">${exp.location || ''}</div>
        </div>
      `;
      dom.experienceSection.appendChild(article);
    });
  }

  function renderEducation(education){
    if(!dom.educationSection) return;
    dom.educationSection.innerHTML = '';
    education.forEach(edu => {
      const wrapper = document.createElement('div');
      wrapper.className = 'edu';
      wrapper.innerHTML = `
        <div class="edu-left">
          <div class="institution">${edu.institution}</div>
          <div class="degree">${edu.degree}</div>
        </div>
        <div class="edu-right">
          <div class="dates">${edu.start} — ${edu.end}</div>
          ${edu.status ? `<div class="status muted">${edu.status}</div>` : ''}
        </div>
      `;
      dom.educationSection.appendChild(wrapper);
    });
  }

  function renderSkills(skills){
    if(!dom.skillsSection) return;
    dom.skillsSection.innerHTML = '';
    skills.forEach(cat => {
      const block = document.createElement('div');
      block.className = 'skill-block';
      const itemsMarkup = (cat.items || []).map(item => {
        const level = Math.min(10, Math.max(1, item.level || 0));
        const width = Math.round((item.level || 0) / 10 * 100);
        const icon = item.image ? `<img class="skill-icon" src="${staticBase}${item.image}" alt="${item.name}">` : '';
        return `
          <div class="skill">
            <div class="skill-meta">
              <div class="label">
                ${icon}
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
      block.innerHTML = `<h3 class="skill-category">${cat.category}</h3>${itemsMarkup}`;
      dom.skillsSection.appendChild(block);
    });
  }

  function setupLanguageEvents(){
    if(!dom.langToggle || !dom.langMenu) return;
    if(localeList.length > 1){
      dom.langToggle.addEventListener('click', () => {
        const expanded = dom.langToggle.getAttribute('aria-expanded') === 'true';
        dom.langToggle.setAttribute('aria-expanded', (!expanded).toString());
        dom.langMenu.classList.toggle('open', !expanded);
      });

      dom.langMenu.addEventListener('click', event => {
        const target = event.target.closest('.dropdown-item');
        if(!target) return;
        const code = target.dataset.lang;
        if(!code || code === state.lang) return;
        state = buildState(code);
        renderLanguage();
        dom.langToggle.setAttribute('aria-expanded', 'false');
        dom.langMenu.classList.remove('open');
      });

      document.addEventListener('click', event => {
        if(!dom.langMenu.contains(event.target) && !dom.langToggle.contains(event.target)){
          dom.langMenu.classList.remove('open');
          dom.langToggle.setAttribute('aria-expanded', 'false');
        }
      });
    } else {
      dom.langToggle.setAttribute('aria-disabled', 'true');
    }
  }

  function updateLanguageMenuState(){
    if(!dom.langMenu) return;
    const buttons = dom.langMenu.querySelectorAll('.dropdown-item');
    buttons.forEach(btn => {
      const code = btn.dataset.lang;
      btn.classList.toggle('active', code === state.lang);
      const labelSpan = btn.querySelectorAll('span')[1];
      if(labelSpan){
        labelSpan.textContent = languageLabels[code] || code.toUpperCase();
      }
    });
  }

  function setupThemeToggle(){
    if(!dom.themeToggle) return;

    const storedTheme = window.localStorage.getItem('resume-theme');
    if(storedTheme === 'light' || storedTheme === 'dark'){
      dom.body.dataset.theme = storedTheme;
      dom.themeToggle.setAttribute('aria-pressed', (storedTheme === 'light').toString());
    }
    updateThemeIcons();

    dom.themeToggle.addEventListener('click', () => {
      const isLight = dom.body.dataset.theme === 'light';
      dom.body.dataset.theme = isLight ? 'dark' : 'light';
      dom.themeToggle.setAttribute('aria-pressed', (!isLight).toString());
      window.localStorage.setItem('resume-theme', dom.body.dataset.theme);
      updateThemeIcons();
    });
  }

  function updateThemeIcons(){
    if(dom.themeSun) dom.themeSun.style.display = dom.body.dataset.theme === 'light' ? 'inline-flex' : 'none';
    if(dom.themeMoon) dom.themeMoon.style.display = dom.body.dataset.theme === 'light' ? 'none' : 'inline-flex';
  }
})();

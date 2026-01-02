from flask import Flask, render_template, request, send_file, jsonify
import json, subprocess, re
from pathlib import Path
from ruamel.yaml import YAML


def is_translation_mapping(node, languages):
    if not isinstance(node, dict) or not node:
        return False
    return all(key in languages for key in node.keys())


def translate_node(node, lang, default_lang, languages):
    if isinstance(node, list):
        return [translate_node(item, lang, default_lang, languages) for item in node]

    if isinstance(node, dict):
        if is_translation_mapping(node, languages):
            candidates = [lang, default_lang, *languages]
            for candidate in candidates:
                if candidate in node:
                    return translate_node(node[candidate], lang, default_lang, languages)
            first_key = next(iter(node))
            return translate_node(node[first_key], lang, default_lang, languages)

        return {key: translate_node(value, lang, default_lang, languages) for key, value in node.items()}

    return node

APP_ROOT = Path(__file__).resolve().parent

app = Flask(__name__, static_folder='static', template_folder='templates')
DATA_PATH = APP_ROOT / 'data' / 'resume.json'
YAML_PATH = APP_ROOT / 'data' / 'resume.yaml'
RENDERCV_OUTPUT = APP_ROOT / 'rendercv_output'

def load_data():
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Normalizar skills ordenadas en el dataset original
    for cat in data.get('skills', []):
        items = cat.get('items', [])
        cat['items'] = sorted(items, key=lambda x: x.get('level', 0), reverse=True)

    return data


def slugify_filename(name, language=None):
    base = re.sub(r'[^A-Za-z0-9]+', '_', name or '').strip('_') or 'resume'
    if language:
        base = f"{base}_{language}"
    return f"{base}.pdf"


def convert_resume_to_rendercv_yaml(dataset, language, destination):
    available_languages = dataset.get('languages', [])
    default_language = dataset.get('default_language') or (available_languages[0] if available_languages else 'es')
    target_language = language if language in available_languages else default_language

    localized = translate_node(dataset, target_language, default_language, available_languages or [default_language])

    def to_text(value):
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, dict):
            for candidate in value.values():
                if isinstance(candidate, str):
                    return candidate.strip()
        if value is None:
            return ''
        return str(value).strip()

    def join_nonempty(separator, *parts):
        filtered = [part for part in parts if part]
        return separator.join(filtered)

    labels = localized.get('labels', {})
    profile = localized.get('profile', {})

    summary_label = 'Resumen' if target_language.startswith('es') else 'Summary'
    experience_label = labels.get('experience', 'Experience')
    education_label = labels.get('education', 'Education')
    skills_label = labels.get('skills', 'Skills')
    languages_label = labels.get('languages_section', 'Languages')
    references_label = labels.get('references', 'Professional References')
    projects_label = labels.get('projects', 'Projects')

    yaml_content = {
        'cv': {'design': {'theme': 'engineeringclassic'}},
    }

    cv_section = yaml_content['cv']

    name_text = to_text(profile.get('name'))
    if name_text:
        cv_section['name'] = name_text
    headline = to_text(profile.get('title'))
    if headline:
        cv_section['headline'] = headline
    email = to_text(profile.get('email'))
    if email:
        cv_section['email'] = email
    website = to_text(profile.get('website'))
    if website:
        cv_section['website'] = website

    social_networks = []
    for entry in localized.get('social', []):
        network = to_text(entry.get('network'))
        username = to_text(entry.get('handle')) or to_text(entry.get('url'))
        if network and username:
            social_networks.append({'network': network, 'username': username})
    if social_networks:
        cv_section['social_networks'] = social_networks

    sections = {}
    cv_section['sections'] = sections

    summary_text = to_text(profile.get('summary'))
    if summary_text:
        summary_items = [paragraph.strip() for paragraph in summary_text.split('\n\n') if paragraph.strip()]
        if summary_items:
            sections[summary_label] = summary_items

    experience_entries = []
    for exp in localized.get('experiences', []):
        company = to_text(exp.get('company'))
        position = to_text(exp.get('role'))
        if not (company and position):
            continue
        entry = {
            'company': company,
            'position': position
        }
        date_text = join_nonempty(' — ', to_text(exp.get('start')), to_text(exp.get('end')))
        if date_text:
            entry['date'] = date_text
        location = to_text(exp.get('location'))
        if location:
            entry['location'] = location
        summary = to_text(exp.get('description'))
        if summary:
            entry['summary'] = summary
        highlights = []
        for bullet in exp.get('bullets', []):
            item = bullet.get('item') if isinstance(bullet, dict) else bullet
            bullet_text = to_text(item)
            if bullet_text:
                highlights.append(bullet_text)
        if highlights:
            entry['highlights'] = highlights
        experience_entries.append(entry)
    if experience_entries:
        sections[experience_label] = experience_entries

    education_entries = []
    for edu in localized.get('education', []):
        institution = to_text(edu.get('institution'))
        area = to_text(edu.get('degree')) or institution
        if not (institution and area):
            continue
        entry = {
            'institution': institution,
            'area': area
        }
        degree = to_text(edu.get('status'))
        if degree:
            entry['degree'] = degree
        date_text = join_nonempty(' — ', to_text(edu.get('start')), to_text(edu.get('end')))
        if date_text:
            entry['date'] = date_text
        education_entries.append(entry)
    if education_entries:
        sections[education_label] = education_entries

    skill_entries = []
    for category in localized.get('skills', []):
        category_name = to_text(category.get('category'))
        if not category_name:
            continue
        details = []
        for item in category.get('items', []):
            name = to_text(item.get('name'))
            if name:
                details.append(name)
        if details:
            skill_entries.append({'label': category_name, 'details': ', '.join(details)})
    if skill_entries:
        sections[skills_label] = skill_entries

    language_entries = []
    for lang_item in localized.get('language_proficiency', []):
        language_name = to_text(lang_item.get('language'))
        if not language_name:
            continue
        entry = {'label': language_name}
        level = to_text(lang_item.get('level'))
        if level:
            entry['details'] = level
        language_entries.append(entry)
    if language_entries:
        sections[languages_label] = language_entries

    reference_entries = []
    for ref in localized.get('references', []):
        full_name = to_text(ref.get('full_name'))
        if not full_name:
            continue
        entry = {'name': full_name}
        role_company = join_nonempty(', ', to_text(ref.get('role')), to_text(ref.get('company')))
        if role_company:
            entry['summary'] = role_company
        highlights = []
        relationship = to_text(ref.get('relationship'))
        if relationship:
            highlights.append(relationship)
        contact = join_nonempty(' • ', to_text(ref.get('email')), to_text(ref.get('phone')))
        if contact:
            highlights.append(contact)
        if highlights:
            entry['highlights'] = highlights
        reference_entries.append(entry)
    if reference_entries:
        sections[references_label] = reference_entries

    project_entries = []
    for project in localized.get('projects', []):
        name = to_text(project.get('name'))
        if not name:
            continue
        url = to_text(project.get('url'))
        entry_name = f"[{name}]({url})" if url else name
        entry = {'name': entry_name}
        description = to_text(project.get('description'))
        if description:
            entry['summary'] = description
        project_entries.append(entry)
    if project_entries:
        sections[projects_label] = project_entries

    yaml = YAML()
    yaml.default_flow_style = False
    destination.parent.mkdir(parents=True, exist_ok=True)
    with open(destination, 'w', encoding='utf-8') as fh:
        yaml.dump(yaml_content, fh)

    return cv_section.get('name', ''), target_language


def generate_rendercv_pdf(language):
    dataset = load_data()
    profile_name, target_language = convert_resume_to_rendercv_yaml(dataset, language, YAML_PATH)

    RENDERCV_OUTPUT.mkdir(parents=True, exist_ok=True)

    try:
        subprocess.run(
            ['rendercv', 'render', str(YAML_PATH)],
            cwd=str(APP_ROOT),
            check=True,
            capture_output=True,
            text=True
        )
    except subprocess.CalledProcessError as exc:
        app.logger.error('RenderCV command failed: %s', exc.stderr or exc.stdout)
        raise RuntimeError('RenderCV command failed') from exc

    pdf_files = sorted(
        RENDERCV_OUTPUT.glob('*.pdf'),
        key=lambda file_path: file_path.stat().st_mtime,
        reverse=True
    )

    if not pdf_files:
        raise FileNotFoundError('No PDF generated by RenderCV')

    pdf_path = pdf_files[0]
    download_name = slugify_filename(profile_name, target_language)
    return pdf_path, download_name

@app.route('/')
def index():
    dataset = load_data()

    available_languages = dataset.get('languages', []) or ['es']
    default_language = dataset.get('default_language', available_languages[0])

    localized = translate_node(dataset, default_language, default_language, available_languages)

    language_labels = {}
    labels = dataset.get('labels', {})
    language_name_map = labels.get('language_name', {})
    for code in available_languages:
        language_labels[code] = translate_node(language_name_map, code, default_language, available_languages)

    return render_template(
        'home.html',
        data=localized,
        raw_data=dataset,
        languages=available_languages,
        language_labels=language_labels,
        default_language=default_language,
        visual=dataset.get('visual', {})
    )


@app.route('/rendercv', methods=['POST'])
def rendercv_export():
    payload = request.get_json(silent=True) or {}
    requested_language = payload.get('language')

    try:
        pdf_path, download_name = generate_rendercv_pdf(requested_language)
        print(pdf_path,download_name)
    except (RuntimeError, FileNotFoundError) as exc:
        return jsonify({'error': str(exc)}), 500
    except Exception as exc:
        app.logger.exception('Unexpected error while generating RenderCV output')
        return jsonify({'error': 'Unable to generate CV'}), 500

    return send_file(pdf_path, as_attachment=True, download_name=download_name, mimetype='application/pdf')

if __name__ == '__main__':
    # Si ejecutas python app.py para desarrollo:
    app.run(host='0.0.0.0', port=8004, debug=True)

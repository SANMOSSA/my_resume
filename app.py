from flask import Flask, render_template
import json, os


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

app = Flask(__name__, static_folder='static', template_folder='templates')
DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'resume.json')

def load_data():
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Normalizar skills ordenadas en el dataset original
    for cat in data.get('skills', []):
        items = cat.get('items', [])
        cat['items'] = sorted(items, key=lambda x: x.get('level', 0), reverse=True)

    return data

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

if __name__ == '__main__':
    # Si ejecutas python app.py para desarrollo:
    app.run(host='0.0.0.0', port=8080, debug=True)

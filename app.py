from flask import Flask, render_template
import json, os

app = Flask(__name__, static_folder='static', template_folder='templates')
DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'resume.json')

def load_data():
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    languages = data.get('languages', {})
    for lang in languages.values():
        for cat in lang.get('skills', []):
            items = cat.get('items', [])
            cat['items'] = sorted(items, key=lambda x: x.get('level', 0), reverse=True)

    return data

@app.route('/')
def index():
    dataset = load_data()
    languages = dataset.get('languages', {})
    default_language = dataset.get('default_language', 'es')
    active = languages.get(default_language) or next(iter(languages.values()), {})

    return render_template(
        'home.html',
        data=active,
        languages=languages,
        default_language=default_language,
        visual=dataset.get('visual', {})
    )

if __name__ == '__main__':
    # Si ejecutas python app.py para desarrollo:
    app.run(host='0.0.0.0', port=8080, debug=True)

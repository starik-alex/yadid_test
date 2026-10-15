# Figma

Два пути — быстрый и правильный.

## Быстрый: html.to.design

Плагин [html.to.design](https://www.figma.com/community/plugin/1159123024924461424) «фотографирует» живую страницу в слои Figma.

1. Выложить сайт (см. README) или запустить `npm run dev`. Для локального адреса плагину нужно расширение для Chrome.
2. Figma → Plugins → html.to.design → вставить адрес.
3. Импортировать дважды: ширина **1440** (десктоп) и **390** (iPhone), светлую и тёмную тему.
4. Состояния снимать по адресам:
   - квиз, вопрос 1 — `/`, прокрутить до `#check`;
   - ошибки формы — пройти квиз и нажать «отправить» с пустыми полями;
   - успех — `/?preview=1`, пройти квиз и отправить (в режиме превью ничего не уходит);
   - вебинар — `/webinar` и `/webinar?preview=1` для экрана успеха.

Минус: слои получаются «плоскими», без компонентов и переменных.

## Правильный: переменные из tokens.json

`design/tokens.json` — дизайн-токены в формате W3C: все цвета (светлая и тёмная темы), размеры шрифтов, начертания, скругления и отступы. Те же значения лежат в `public/css/styles.css`, и тест `tests/static.test.js` проверяет, что они совпадают.

1. Установить плагин **Tokens Studio for Figma** (или любой импортёр W3C Design Tokens в Variables).
2. Tokens Studio → Load from file → `design/tokens.json`.
3. Export to Figma → Variables. Получатся коллекции:
   - `color/light/*` и `color/dark/*` — сделать из них один набор с двумя режимами (Light / Dark);
   - `radius/*`, `space/*`, `size/*`;
   - `font/size/*` и `font/weight/*` → текстовые стили.
4. Собрать компоненты на переменных:
   - **Button** — primary / ghost / whatsapp; состояния default / hover / loading / disabled; высота 48, скругление `radius/pill`.
   - **Quiz option** — default / hover / selected (рамка `color/action`, галочка) / focus.
   - **Input** — default / focus / error (рамка `color/error`, фон `color/error-bg`, текст ошибки 14 px).
   - **Checkbox row** — default / checked / error.
   - **Glass card** — заливка `glass/light` (62% белого), Background blur 28, обводка `glass/light-border`, тень 0/20/60 navy 14%.
   - **Trust card**, **Step card**, **FAQ item**, **Mobile bar**.
5. Рамки: Desktop 1440, Mobile 390 (`size/mobile-frame`). Во всех текстовых слоях с ивритом выравнивание по правому краю, направление RTL.

Тогда макет совпадает с кодом один в один: поменяли цвет в токенах — он меняется и в Figma, и (после правки CSS) на сайте.

## Шрифты в Figma

- Иврит: **Heebo** (Google Fonts) — его же видят пользователи Windows и Android.
- Для макета «как на iPhone» можно поставить SF Pro / SF Hebrew, если они установлены.

# Репозиторій GitHub

Публічний репозиторій: https://github.com/student12210/student-task-manager

Власник: student12210. Основна гілка: main. Дата публікації: 9 листопада 2026 року.

Файли опубліковано через вебінтерфейс GitHub із комітами безпосередньо в main. Команда git push під час цієї публікації не виконувалася. Якщо викладач вимагає її виконання в терміналі, цей крок потрібно підтвердити окремо.

## Завантаження та запуск

```sh
git clone https://github.com/student12210/student-task-manager.git
cd student-task-manager
node src/server.js
```

Відкрийте http://127.0.0.1:3000. Потрібен Node.js 22 або новіший. Зупинка: Ctrl+C. Перевірки: node --test.

## Подальші зміни через Git

У клона GitHub автоматично буде налаштовано origin. Після власного редагування файлів:

```sh
git status
git add .
git commit -m "Update student task manager"
git push origin main
```

Автентифікацію виконуйте через власний браузер або Git Credential Manager. Конфіденційні дані не додавайте до файлів чи URL. Папка data виключена у .gitignore.

## Історія у комплекті

student-task-manager.bundle зберігає окрему локальну історію підготовки. Історія комітів вебінтерфейсу GitHub має інше походження. Для роботи з опублікованою версією використовуйте клон GitHub, а не bundle. Примусове перезаписування віддаленої історії не потрібне.

## Перевірка доступу

Позначка Public відображається на головній сторінці репозиторію. Код для комісії доступний за URL вище. Репозиторій містить src, public, test, docs, README.md, .gitignore, package.json, package-lock.json і start.cmd.

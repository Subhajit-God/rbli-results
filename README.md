# RBLI School Results Portal

A modern **school result management system** built for **RBLI School** using **React, TypeScript, Vite, Tailwind CSS, shadcn/ui**, and **Supabase**.

This project allows students to **view results online** and administrators to **manage students, subjects, exams, and marks** using a secure admin panel.

---

## ✨ Features

### 👨‍🎓 Student Side

* Search results using roll number / details
* View marks, grades, rank, and performance
* Mobile-friendly result view
* QR code result access
* Result verification page

### 🧑‍💼 Admin Side

* Secure admin login
* Manage students, subjects, and exams
* Upload marks using Excel files (bulk upload supported)
* Auto rank calculation
* Academic year management
* PDF assets and deployment tools

### ⚙️ System

* AI chatbot support
* Supabase authentication & database
* Responsive UI with Tailwind & shadcn/ui
* Fast build using Vite

---

## 🧱 Tech Stack

* **Frontend**: React + TypeScript
* **Styling**: Tailwind CSS, shadcn/ui
* **Backend**: Supabase (Database, Auth, Functions)
* **Build Tool**: Vite
* **Package Manager**: npm / bun

---

## 📁 Project Structure (Simple)

```
rbli-results/
├── public/            # Static files
├── src/               # Main source code
│   ├── components/    # Reusable UI components
│   ├── pages/         # App pages (Home, Admin, Verify)
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Helper utilities
│   ├── assets/        # Images and logos
│   └── integrations/  # Supabase connection
├── supabase/          # Backend functions & migrations
├── index.html         # Main HTML file
├── package.json       # Dependencies and scripts
└── README.md          # Project documentation
```

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone <repository-url>
cd rbli-results
```

### 2️⃣ Install Dependencies

```bash
npm install
# or
bun install
```

### 3️⃣ Setup Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

⚠️ **Do not share this file publicly**

### 4️⃣ Run the Project

```bash
npm run dev
```

The app will run on:

```
http://localhost:5173
```

---

## 🗄️ Supabase Setup

* Create a Supabase project
* Run SQL files from `supabase/migrations/`
* Enable authentication (email/password)
* Deploy Supabase edge functions if required

---

## 📊 Admin Excel Upload Rules

* Excel file must follow correct column format
* Bulk upload supported for marks
* Rank calculation happens automatically
* Class 9 promotion data is downloadable

---

## 🔐 Security Notes

* Admin routes are protected
* Environment variables are hidden
* Supabase Row Level Security (RLS) is used

---

## 🛠️ Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

---

## 📌 Future Improvements

* Student login system
* SMS / Email result notification
* More analytics & charts
* Multi-school support

---

## 📄 License

This project is for **educational and school use**.

---

## 🏫 School

**RBLI School**

---

## 🙌 Creator

**Subhajit Das**

Developed for school result management with a focus on **simplicity, speed, and usability**.

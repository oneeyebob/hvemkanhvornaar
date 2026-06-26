# Hvem Kan Hvor Naar

En simpel Doodle-kopi til at finde fælles datoer, som alle deltagere kan bakke op om.

## Features
- Opret afstemninger med flere datoer
- Brugere kan stemme på, hvilke datoer de kan
- Vis resultater med fælles datoer (alle kan) og detaljeret oversigt
- Admin kan oprette brugere og afstemninger
- Lukket system med brugernavn/kodeord

## Teknologier
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js/Express
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel

## Opsætning

### 1. Opret Supabase-projekt
1. Gå til [Supabase Dashboard](https://supabase.com/dashboard) og opret et nyt projekt.
2. Gå til **SQL Editor** og kør SQL-schemaet fra `supabase/schema.sql`.
3. Notér din **Project URL** og **anon key** (findes under Project Settings > API).

### 2. Opret miljøvariable
Opret en `.env`-fil i rodmappen med følgende indhold:
```env
SUPABASE_URL=din-supabase-url
SUPABASE_KEY=din-supabase-anon-key
```

### 3. Opret admin-bruger
1. Gå til **Table Editor** i Supabase.
2. Tilføj en række til `users`-tabellen:
   - `username`: dit brugernavn
   - `password_hash`: hash af dit kodeord (brug `bcrypt.hash(password, 10)` i Node.js)
   - `role`: `admin`

Eller kør følgende JavaScript for at generere en hash:
```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('dit-kodeord', 10);
console.log(hash);
```

### 4. Deploy til Vercel
1. Push koden til et GitHub-repository.
2. Gå til [Vercel](https://vercel.com/) og importer repositoryet.
3. Tilføj miljøvariablene (`SUPABASE_URL` og `SUPABASE_KEY`) i Vercel-projektet.
4. Deploy.

## Projektstruktur
```
/
├── api/
│   └── index.js          # Express-server med API-endpoints
├── public/
│   ├── login.html        # Login-side
│   ├── admin.html        # Admin-side (opret brugere/afstemninger)
│   ├── polls.html        # Liste over afstemninger
│   ├── poll.html         # Afstemningsside
│   ├── results.html      # Resultatside
│   └── style.css         # Fælles CSS
├── supabase/
│   └── schema.sql        # Supabase-database-schema
├── package.json
├── vercel.json           # Vercel-konfiguration
└── README.md
```

## API Endpoints
| Metode | Endpoint          | Beskrivelse                     | Autentifikation |
|--------|-------------------|---------------------------------|------------------|
| POST   | /api/login        | Login med brugernavn/kodeord   | Ingen            |
| POST   | /api/users        | Opret ny bruger                 | Admin            |
| GET    | /api/users        | Liste alle brugere              | Admin            |
| POST   | /api/polls        | Opret ny afstemning             | Admin            |
| GET    | /api/polls        | Liste alle afstemninger        | Ingen            |
| GET    | /api/polls/:id    | Hent afstemning + stemmer      | Ingen            |
| POST   | /api/votes        | Afgiv stemme                   | Bruger           |

## Licens
MIT

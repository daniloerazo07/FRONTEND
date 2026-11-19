# Frontend de productos

Frontend estático con Vite para consumir la API del proyecto `TAREA_DESARROLLO_BACKEND`.

## Ejecutar localmente

```powershell
npm.cmd install
npm.cmd run dev
```

La aplicación se abre normalmente en `http://127.0.0.1:5173`. Por defecto consume:

```text
http://127.0.0.1:5050/api/v1
```

Para cambiar la URL, copia `.env.example` a `.env` y modifica `VITE_API_URL`.

## Producción

```powershell
npm.cmd run build
npm.cmd run preview
```

La carpeta `dist` contiene los archivos estáticos que pueden publicarse en GitHub Pages.

El workflow de GitHub Pages configura automáticamente la API pública:

```text
https://backend-5ssi.onrender.com/api/v1
```

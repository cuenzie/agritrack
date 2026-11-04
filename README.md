# AgriTrack

AgriTrack is a green-themed Ionic Angular agriculture-tool inventory based on the supplied CRUD lab brief. Add equipment, browse Firestore updates in real time, search and filter the inventory, update tool details, mark items as serviced, and remove items. The three tabs are **Add tool**, **Inventory**, and **Care guide**.

## Run locally

```bash
npm install
npm start
```

The app runs at `http://localhost:4200`. To build and lint:

```bash
npm run build
npm run lint
```

## Firebase

The Firebase web-app configuration for project `user-crud-5d31d` is in `src/environments/environment.ts` and `src/environments/environment.prod.ts`. Firebase web configuration is included in client code by design; it is not an authorization secret.

Enable Cloud Firestore for the project and configure Firestore Security Rules for the access model you intend to use before deploying. This starter does not include sign-in, so do not use open/public Firestore rules for production. Equipment records are stored in the `agricultureTools` collection with a name, category, brand, storage location, condition, last-maintenance date, purchase date, notes, and creation timestamp.

## Mobile

The project includes Capacitor. After building, add the native platform you need with `npx cap add android` or `npx cap add ios`, then use `npx cap sync` after future web builds.

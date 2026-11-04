import { Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { FirebaseError, initializeApp } from 'firebase/app';
import { BehaviorSubject, filter } from 'rxjs';
import { environment } from '../../environments/environment';
import { AgricultureTool, AgricultureToolDraft } from './tool.model';

const firebaseApp = initializeApp(environment.firebaseConfig);

@Injectable({ providedIn: 'root' })
export class AgricultureToolService {
  private readonly firestore: Firestore = getFirestore(firebaseApp);
  private readonly toolsCollection = collection(this.firestore, 'agricultureTools');
  private readonly toolsSubject = new BehaviorSubject<AgricultureTool[]>([]);
  private readonly errorSubject = new BehaviorSubject<FirebaseError | null>(null);

  readonly tools$ = this.toolsSubject.asObservable();
  readonly errors$ = this.errorSubject
    .asObservable()
    .pipe(filter((error): error is FirebaseError => error !== null));

  constructor() {
    onSnapshot(
      this.toolsCollection,
      (snapshot) => {
        const tools = snapshot.docs.map((toolDocument) => ({
          id: toolDocument.id,
          ...toolDocument.data(),
        })) as AgricultureTool[];

        this.errorSubject.next(null);
        this.toolsSubject.next(
          tools.sort((first, second) => (second.createdAt ?? 0) - (first.createdAt ?? 0)),
        );
      },
      (error) => this.errorSubject.next(error),
    );
  }

  createToolId(): string {
    return doc(this.toolsCollection).id;
  }

  async addTool(tool: AgricultureToolDraft, id: string): Promise<void> {
    const createdAt = Date.now();
    await setDoc(doc(this.toolsCollection, id), {
      ...tool,
      createdAt,
    });

    this.toolsSubject.next(
      [
        ...this.toolsSubject.value.filter((existingTool) => existingTool.id !== id),
        { ...tool, id, createdAt },
      ].sort((first, second) => (second.createdAt ?? 0) - (first.createdAt ?? 0)),
    );
  }

  async updateTool(id: string, tool: AgricultureToolDraft): Promise<void> {
    await updateDoc(doc(this.firestore, 'agricultureTools', id), tool);
  }

  async deleteTool(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'agricultureTools', id));
  }
}

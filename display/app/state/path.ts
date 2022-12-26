import { BehaviorSubject } from 'rxjs';

export const path$ = new BehaviorSubject<readonly PathItem[]>([]);

import { BehaviorSubject } from 'rxjs';

export const gameData$ = new BehaviorSubject<null | GameData>(null);

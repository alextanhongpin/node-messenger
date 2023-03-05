import { AppError } from "types/error";

export class StoreError<T> extends AppError<T> {}

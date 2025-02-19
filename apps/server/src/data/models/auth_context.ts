import { auth } from "../../lib/auth";

export type AuthContext = typeof auth.$Infer.Session;

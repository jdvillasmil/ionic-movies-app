const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use':    'Este correo ya está registrado',
  'auth/invalid-credential':      'Correo o contraseña incorrectos',
  'auth/wrong-password':          'Correo o contraseña incorrectos',
  'auth/user-not-found':          'No existe una cuenta con este correo',
  'auth/weak-password':           'La contraseña debe tener al menos 6 caracteres',
  'auth/network-request-failed':  'Error de conexión. Verifica tu internet',
  'auth/too-many-requests':       'Demasiados intentos. Espera un momento',
  'auth/invalid-email':           'Correo electrónico inválido',
};

export function getAuthErrorMessage(error: unknown): string {
  const code = (error as any)?.code ?? 'unknown';
  return MESSAGES[code] ?? `Error: ${code}`;
}

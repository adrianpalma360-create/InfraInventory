export interface SqlValidationResult {
  isValid: boolean;
  sanitizedSql?: string;
  rejectionReason?: string;
}

const FORBIDDEN_KEYWORDS = [
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bDROP\b/i,
  /\bALTER\b/i,
  /\bTRUNCATE\b/i,
  /\bCREATE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bEXEC\b/i,
  /\bEXECUTE\b/i,
  /\bCOPY\b/i,
  /\bVACUUM\b/i,
  /\bREINDEX\b/i,
  /\bPG_SLEEP\b/i,
  /\bPG_TERMINATE_BACKEND\b/i,
  /\bDBLINK\b/i,
  /\bXP_\w+/i,
  /\bSHUTDOWN\b/i,
  /\bINTO\s+OUTFILE\b/i,
  /\bINTO\s+DUMPFILE\b/i,
  /\bLOAD_FILE\b/i,
];

const FORBIDDEN_COLUMNS = [
  /\bpasswordHash\b/i,
  /\bpassword\b/i,
  /\bapiKeyEncrypted\b/i,
  /\blicenseKeyEncrypted\b/i,
  /\btoken\b/i,
  /\bsessionToken\b/i,
];

export class SafeSqlValidator {
  static validateAndSanitize(rawSql: string): SqlValidationResult {
    if (!rawSql || typeof rawSql !== 'string') {
      return { isValid: false, rejectionReason: 'La consulta SQL está vacía.' };
    }

    const trimmed = rawSql.trim().replace(/^```sql/i, '').replace(/^```/, '').replace(/```$/, '').trim();

    // Must start with SELECT or WITH (Common Table Expression)
    if (!/^(SELECT|WITH)\b/i.test(trimmed)) {
      return {
        isValid: false,
        rejectionReason: 'Solo se permiten consultas de solo lectura (SELECT / WITH). Operaciones destructivas o de modificación están prohibidas.',
      };
    }

    // Check for semicolons that might indicate multi-query chaining
    const statements = trimmed.split(';').map((s) => s.trim()).filter(Boolean);
    if (statements.length > 1) {
      return {
        isValid: false,
        rejectionReason: 'No se permite la ejecución de múltiples sentencias encadenadas.',
      };
    }

    const singleQuery = statements[0];

    // Check against all forbidden keywords
    for (const pattern of FORBIDDEN_KEYWORDS) {
      if (pattern.test(singleQuery)) {
        return {
          isValid: false,
          rejectionReason: `Operación prohibida detectada en la consulta: "${pattern.source}". La IA opera exclusivamente en modo seguro de lectura.`,
        };
      }
    }

    // Check against forbidden sensitive columns
    for (const colPattern of FORBIDDEN_COLUMNS) {
      if (colPattern.test(singleQuery)) {
        return {
          isValid: false,
          rejectionReason: `Acceso denegado a campo de seguridad protegido (${colPattern.source}). Las credenciales y claves privadas no son accesibles para la IA.`,
        };
      }
    }

    // Ensure query contains a LIMIT clause to prevent memory exhaustion (max 100 rows)
    let sanitizedSql = singleQuery;
    if (!/\bLIMIT\s+\d+\b/i.test(sanitizedSql)) {
      sanitizedSql = `${sanitizedSql} LIMIT 50`;
    }

    return {
      isValid: true,
      sanitizedSql,
    };
  }
}

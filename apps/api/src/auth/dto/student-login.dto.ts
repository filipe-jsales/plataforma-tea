import { ArrayMaxSize, ArrayMinSize, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class StudentLoginDto {
  @IsUUID()
  userId: string;

  // Sequência de 3 ids de Illustration(kind=login_image), na ordem em que o
  // aluno clicou — comparação é exata (índice a índice), não um conjunto.
  @IsUUID('4', { each: true })
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  imageSequence: string[];

  // Observados pelo front (tempo entre abrir a tela e submeter, tentativas
  // anteriores nesta sessão de tela) — o backend não tem como medir isso
  // sozinho. Usados só para o evento login_attempt (RD-I), nunca para lógica
  // de autenticação.
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  retryCount?: number;
}

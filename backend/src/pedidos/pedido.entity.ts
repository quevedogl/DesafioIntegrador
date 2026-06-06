import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Cliente } from '../clientes/cliente.entity';
import { PedidoItem } from './pedido-item.entity';

export type StatusPedido = 'Pendente' | 'Confirmado' | 'Enviado' | 'Entregue' | 'Cancelado';

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Cliente, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clienteId' })
  cliente: Cliente;

  @OneToMany(() => PedidoItem, (item) => item.pedido, { cascade: true, eager: true })
  itens: PedidoItem[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  categoria: string | null;

  @Column({ type: 'varchar', default: 'Pendente' })
  status: StatusPedido;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}

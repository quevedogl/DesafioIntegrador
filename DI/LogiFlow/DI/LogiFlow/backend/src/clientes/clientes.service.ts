import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from './cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly repo: Repository<Cliente>,
  ) {}

  async create(dto: CreateClienteDto): Promise<Cliente> {
    const existing = await this.repo.findOneBy({ email: dto.email });
    if (existing) {
      throw new ConflictException('Já existe um cliente com esse e-mail.');
    }
    const cliente = this.repo.create(dto);
    return this.repo.save(cliente);
  }

  findAll(): Promise<Cliente[]> {
    return this.repo.find({ order: { criadoEm: 'DESC' } });
  }

  async findOne(id: string): Promise<Cliente> {
    const cliente = await this.repo.findOneBy({ id });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');
    return cliente;
  }

  async update(id: string, dto: UpdateClienteDto): Promise<Cliente> {
    const cliente = await this.findOne(id);
    if (dto.email && dto.email !== cliente.email) {
      const existing = await this.repo.findOneBy({ email: dto.email });
      if (existing) throw new ConflictException('Já existe um cliente com esse e-mail.');
    }
    Object.assign(cliente, dto);
    return this.repo.save(cliente);
  }

  async remove(id: string): Promise<void> {
    const cliente = await this.findOne(id);
    await this.repo.remove(cliente);
  }
}

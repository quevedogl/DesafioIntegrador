import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Produto } from './produto.entity';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';

@Injectable()
export class ProdutosService {
  constructor(
    @InjectRepository(Produto)
    private readonly repo: Repository<Produto>,
  ) {}

  create(dto: CreateProdutoDto): Promise<Produto> {
    const produto = this.repo.create({
      ...dto,
      categoria: dto.categoria ?? null,
    });
    return this.repo.save(produto);
  }

  findAll(): Promise<Produto[]> {
    return this.repo.find({ order: { criadoEm: 'DESC' } });
  }

  async findOne(id: string): Promise<Produto> {
    const produto = await this.repo.findOneBy({ id });
    if (!produto) throw new NotFoundException('Produto não encontrado.');
    return produto;
  }

  async update(id: string, dto: UpdateProdutoDto): Promise<Produto> {
    const produto = await this.findOne(id);
    Object.assign(produto, {
      ...dto,
      categoria: dto.categoria !== undefined ? (dto.categoria ?? null) : produto.categoria,
    });
    return this.repo.save(produto);
  }

  async remove(id: string): Promise<void> {
    const produto = await this.findOne(id);
    await this.repo.remove(produto);
  }
}

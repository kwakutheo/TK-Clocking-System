import { Repository, FindManyOptions, FindOneOptions, DeepPartial, SaveOptions, ObjectLiteral } from 'typeorm';
import { tenantStorage } from '../middleware/tenant.middleware';

export class TenantBoundRepository<T extends ObjectLiteral> extends Repository<T> {
  
  private appendTenantId<OptionsType>(options?: OptionsType): OptionsType {
    const tenantId = tenantStorage.getStore();
    if (tenantId) {
      const opts = (options || {}) as any;
      opts.where = { ...opts.where, tenantId };
      return opts as OptionsType;
    }
    return options as OptionsType;
  }

  // --- Read Operations ---
  override async find(options?: FindManyOptions<T>): Promise<T[]> {
    return super.find(this.appendTenantId(options));
  }

  override async findBy(where: any): Promise<T[]> {
    const tenantId = tenantStorage.getStore();
    if (tenantId) {
       where = { ...where, tenantId };
    }
    return super.findBy(where);
  }

  override async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return super.findOne(this.appendTenantId(options));
  }

  override async count(options?: FindManyOptions<T>): Promise<number> {
    return super.count(this.appendTenantId(options));
  }

  // --- Write/Update Operations ---
  override async save<Entity extends DeepPartial<T>>(entity: Entity, options?: SaveOptions): Promise<Entity>;
  override async save<Entity extends DeepPartial<T>>(entities: Entity[], options?: SaveOptions): Promise<Entity[]>;
  override async save<Entity extends DeepPartial<T>>(entityOrEntities: Entity | Entity[], options?: SaveOptions): Promise<Entity | Entity[]> {
    const tenantId = tenantStorage.getStore();
    if (tenantId) {
      if (Array.isArray(entityOrEntities)) {
        entityOrEntities.forEach((e: any) => {
          if (!e.tenantId) e.tenantId = tenantId;
        });
      } else {
        if (!(entityOrEntities as any).tenantId) {
          (entityOrEntities as any).tenantId = tenantId;
        }
      }
    }
    return super.save(entityOrEntities as any, options);
  }
}

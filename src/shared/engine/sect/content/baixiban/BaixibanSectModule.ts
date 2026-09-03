import {
  StandardSectModule,
  type SectBuildBuilder,
  type SectProjectionContext,
} from '../../core';
import { compileBaixibanBase } from './base/BaixibanBaseCompiler';
import { BaixibanBaseSelectionStrategy } from './base/BaixibanBaseSelectionStrategy';
import { BAIXIBAN_BASE_DEFINITION } from './definition';
import { BAIXIBAN_ORGANIZATION_THEME } from './organization/BaixibanOrganizationModule';
import { BAIXIBAN_HEAVY_PATH_MODULE } from './paths/heavy/HeavySwordPathModule';
import { BAIXIBAN_SWIFT_PATH_MODULE } from './paths/swift/SwiftSwordPathModule';

/** `baixiban` 稳定模块只组合百戏班基础传承和两个独立流派。 */
export class BaixibanSectModule extends StandardSectModule {
  constructor() {
    super(
      BAIXIBAN_BASE_DEFINITION,
      [BAIXIBAN_SWIFT_PATH_MODULE, BAIXIBAN_HEAVY_PATH_MODULE],
      {
        organizationTheme: BAIXIBAN_ORGANIZATION_THEME,
      },
    );
  }

  protected compileBase(
    context: SectProjectionContext,
    builder: SectBuildBuilder,
  ): void {
    compileBaixibanBase(context, builder);
  }

  createBaseSelectionStrategy() {
    return new BaixibanBaseSelectionStrategy();
  }
}

export const BAIXIBAN_MODULE = new BaixibanSectModule();
export const BAIXIBAN_SECT = BAIXIBAN_MODULE.definition;

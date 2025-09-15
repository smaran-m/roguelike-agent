import { Entity } from '../../types';
import { Logger } from '../../utils/Logger';
import { getFontFamily, getFontSizes } from '../../config/fonts';

export interface ActionOption {
  action: any;
  validTargets: any[];
  displayText: string;
  targetingInfo: string;
  canExecute: boolean;
}

export interface ActionSelectionCallbacks {
  onActionSelected: (action: any, target: any) => void;
  onCancel: () => void;
}

export class ActionSelectionUI {
  private container: HTMLElement | null = null;
  private currentActions: ActionOption[] = [];
  private selectedIndex: number = 0;
  private isVisible: boolean = false;
  private callbacks: ActionSelectionCallbacks;
  private logger: Logger;
  private boundKeyHandler: (e: KeyboardEvent) => void;

  constructor(callbacks: ActionSelectionCallbacks, logger: Logger) {
    this.callbacks = callbacks;
    this.logger = logger;
    this.boundKeyHandler = this.handleKeyDown.bind(this);
    this.createContainer();
  }

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'action-selection-ui';
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #000;
      border: 1px solid #333;
      font-family: ${getFontFamily()};
      font-size: ${getFontSizes().medium}px;
      color: #fff;
      padding: 10px;
      z-index: 10000;
      display: none;
      white-space: pre;
      width: 200px;
      min-height: 120px;
    `;
    document.body.appendChild(this.container);
  }

  public show(actionOptions: ActionOption[]): void {
    if (!this.container) return;

    this.currentActions = actionOptions;
    this.selectedIndex = 0;
    this.isVisible = true;

    this.renderContent();
    this.container.style.display = 'block';
    document.addEventListener('keydown', this.boundKeyHandler, true);

    this.logger.debug('Action selection UI shown', {
      actionCount: actionOptions.length,
      actions: actionOptions.map(opt => opt.action.name)
    });
  }

  public hide(): void {
    if (!this.container) return;

    this.isVisible = false;
    this.container.style.display = 'none';
    this.currentActions = [];
    this.selectedIndex = 0;

    document.removeEventListener('keydown', this.boundKeyHandler, true);
    this.logger.debug('Action selection UI hidden');
  }

  private renderContent(): void {
    if (!this.container) return;

    let content = '';

    this.currentActions.forEach((option, index) => {
      const isSelected = index === this.selectedIndex;
      const arrow = isSelected ? '> ' : '  ';
      content += `${arrow}${option.action.name}\n`;
    });

    this.container.textContent = content;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isVisible) return;

    e.preventDefault();
    e.stopPropagation();

    switch (e.key) {
      case 'ArrowUp':
        this.moveSelection(-1);
        break;
      case 'ArrowDown':
        this.moveSelection(1);
        break;
      case 'Enter':
      case ' ':
        this.selectCurrentAction();
        break;
      case 'Escape':
        this.cancel();
        break;
    }
  }

  private moveSelection(direction: number): void {
    if (this.currentActions.length === 0) return;

    this.selectedIndex = Math.max(0, Math.min(
      this.currentActions.length - 1,
      this.selectedIndex + direction
    ));

    this.renderContent();
  }

  private selectCurrentAction(): void {
    const selectedOption = this.currentActions[this.selectedIndex];
    if (selectedOption && selectedOption.canExecute) {
      this.selectAction(this.selectedIndex);
    }
  }

  private selectAction(index: number): void {
    const option = this.currentActions[index];
    if (!option || !option.canExecute) return;

    this.logger.debug('Action selected', {
      actionId: option.action.id,
      actionName: option.action.name,
      validTargets: option.validTargets.length
    });

    this.handleActionTargeting(option);
  }

  private handleActionTargeting(option: ActionOption): void {
    const action = option.action;
    const targeting = action.targeting;

    if (!targeting) {
      this.logger.error('Action has no targeting information', { actionId: action.id });
      return;
    }

    let selectedTarget = null;

    switch (targeting.type) {
      case 'self':
      case 'none':
        selectedTarget = null;
        break;
      case 'single':
        if (option.validTargets.length > 0) {
          selectedTarget = option.validTargets[0];
        } else {
          this.logger.warn('No valid targets for single target action', { actionId: action.id });
          return;
        }
        break;
      case 'area':
        if (option.validTargets.length > 0) {
          selectedTarget = option.validTargets[0];
        }
        break;
      default:
        this.logger.warn('Unknown targeting type', { type: targeting.type, actionId: action.id });
        return;
    }

    this.hide();
    this.callbacks.onActionSelected(action, selectedTarget);
  }

  private cancel(): void {
    this.hide();
    this.callbacks.onCancel();
  }

  public destroy(): void {
    this.hide();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }

  public isShowing(): boolean {
    return this.isVisible;
  }
}

export function createActionOptions(
  actionsWithTargets: Array<{action: any, validTargets: any[]}>,
  performer: Entity
): ActionOption[] {
  return actionsWithTargets.map(({ action, validTargets }) => {
    const targetingInfo = generateTargetingInfo(action, validTargets);
    const canExecute = canExecuteAction(action, validTargets, performer);

    return {
      action,
      validTargets,
      displayText: action.name,
      targetingInfo,
      canExecute
    };
  });
}

function generateTargetingInfo(action: any, validTargets: any[]): string {
  const targeting = action.targeting;
  if (!targeting) return 'No targeting info';

  switch (targeting.type) {
    case 'self':
      return 'Self';
    case 'none':
      return 'No target required';
    case 'single':
      return `Single target (${validTargets.length} available)`;
    case 'area':
      return `Area effect (${validTargets.length} positions)`;
    default:
      return `${targeting.type}`;
  }
}

function canExecuteAction(action: any, validTargets: any[], _performer: Entity): boolean {
  const targeting = action.targeting;
  if (!targeting) return false;

  switch (targeting.type) {
    case 'self':
    case 'none':
      return true;
    case 'single':
    case 'area':
      return validTargets.length > 0;
    default:
      return false;
  }
}
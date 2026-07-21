/**
 * Barrel export for all domain models.
 * Consumers import from '@models' or '../models' rather than individual files.
 */
export type { IAIResponse } from './AIResponse';
export type { IFinding, IAIExplanation, Severity, RuleCategory } from './Finding';
export type { IJavaClass, ClassType, SpringStereotype } from './JavaClass';
export type { IJavaField, InjectionType, Visibility } from './JavaField';
export type { IJavaMethod, IJavaParameter } from './JavaMethod';
export type { IProjectSummary } from './ProjectSummary';
export type { IProviderConfig, AIProviderType } from './ProviderConfig';
export type { IReviewReport } from './ReviewReport';
export type { IRuleConfig } from './RuleConfig';
export type { ICategoryScore, IProjectScore, IScoreDeduction, ScoreGrade } from './Score';
export type { IStructuredPrompt } from './StructuredPrompt';

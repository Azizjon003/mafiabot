import { Role, ChatSettings } from "@prisma/client";
import { shuffle } from "../utils/helpers";
import { roleTemplatesService } from "../services/role-templates.service";
import { UNIQUE_ROLES } from "../services/role-templates.defaults";
import {
  calculateRoleDistribution,
  RoleDistributionResult,
} from "../services/role-distribution.formula";

interface RoleConfig {
  role: Role;
  settingsKey: keyof ChatSettings | null;
}

/**
 * Formula-based role assignment.
 * Uses Mafia Count formula + Power Role Pool + Civilian Floor.
 */
export async function assignRoles(
  playerCount: number,
  settings: ChatSettings
): Promise<Role[]> {
  // Get formula-based distribution
  const distribution = await calculateRoleDistribution(playerCount, settings);
  const roles = distribution.roles;

  // Assign roles to players (priority to preferred roles)
  // This is handled in GameEngine.assignRoles() which calls this function
  // The returned roles array will be assigned to players

  return roles;
}

/**
 * Get role distribution preview for admin panel
 */
export async function getRoleDistributionPreview(
  playerCount: number,
  settings: ChatSettings
): Promise<RoleDistributionResult> {
  return getRoleDistributionPreview(playerCount, settings);
}

/**
 * Validate that settings allow a valid game
 */
export function validateRoleSettings(settings: ChatSettings): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // At least Sheriff must be enabled (SHERIFF is always enabled in formula)
  // At least one protective role
  if (!settings.enableWarlock) {
    errors.push("Kamida bitta himoya roli (WARLOCK) yoqilgan bo'lishi kerak");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
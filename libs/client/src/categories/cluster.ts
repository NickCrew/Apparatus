/**
 * Cluster API
 * Cluster member management and distributed attack coordination
 */

import type { HttpClient } from '../http.js';
import type {
  ClusterMembersResponse,
  ClusterMember,
  ClusterAttackRequest,
  ClusterAttackResponse,
} from '../types.js';

export class ClusterApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get cluster members
   * GET /cluster/members
   */
  async members(): Promise<ClusterMembersResponse> {
    return this.http.get<ClusterMembersResponse>('/cluster/members');
  }

  /**
   * Get list of all cluster members
   */
  async getMemberList(): Promise<ClusterMember[]> {
    const response = await this.members();
    return response.members;
  }

  /**
   * Get cluster leader
   */
  async getLeader(): Promise<string> {
    const response = await this.members();
    return response.leader;
  }

  /**
   * Get healthy members only
   */
  async getHealthyMembers(): Promise<ClusterMember[]> {
    const response = await this.members();
    return response.members.filter(m => m.status === 'healthy');
  }

  /**
   * Get member count
   */
  async getMemberCount(): Promise<number> {
    const response = await this.members();
    return response.members.length;
  }

  /**
   * Check if a specific node is a member
   */
  async isMember(hostname: string): Promise<boolean> {
    const response = await this.members();
    return response.members.some(m => m.hostname === hostname);
  }

  /**
   * Start a distributed cluster attack
   * POST /cluster/attack
   */
  async attack(request: ClusterAttackRequest): Promise<ClusterAttackResponse> {
    return this.http.post<ClusterAttackResponse>('/cluster/attack', request);
  }

  /**
   * Start an attack of specified type
   */
  async startAttack(type: string, params?: Record<string, unknown>): Promise<ClusterAttackResponse> {
    return this.attack({ type, params });
  }

  /**
   * Start an attack targeting a specific endpoint
   */
  async attackTarget(type: string, target: string): Promise<ClusterAttackResponse> {
    return this.attack({ type, target });
  }

  /**
   * Get attack status by ID
   * GET /cluster/attack/:id
   */
  async getAttackStatus(attackId: string): Promise<ClusterAttackResponse> {
    return this.http.get<ClusterAttackResponse>(`/cluster/attack/${encodeURIComponent(attackId)}`);
  }

  /**
   * Stop an attack
   * DELETE /cluster/attack/:id
   */
  async stopAttack(attackId: string): Promise<{ message: string }> {
    return this.http.delete<{ message: string }>(`/cluster/attack/${encodeURIComponent(attackId)}`);
  }
}

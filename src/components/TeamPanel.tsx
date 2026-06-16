import React from 'react'
import { TeamSummary } from '../data/constructionData'

interface Props {
  teams: TeamSummary[]
  activeTeam: string | null
  onSelect: (teamName: string | null) => void
}

function getProgressColor(progress: number): string {
  if (progress >= 99.5) return '#4ade80'
  if (progress > 0.5) return '#38bdf8'
  return '#475569'
}

function getStatusClass(progress: number): string {
  if (progress >= 99.5) return 'completed'
  if (progress > 0.5) return 'in-progress'
  return 'pending'
}

const STATUS_LABEL: Record<string, string> = {
  completed: '已完工',
  'in-progress': '施工中',
  pending: '未开始',
}

const TeamPanel: React.FC<Props> = ({ teams, activeTeam, onSelect }) => {
  return (
    <div className="team-panel">
      <div className="team-panel-header">
        <span className="team-panel-title">班组工作量看板</span>
        <span
          className="team-panel-clear"
          onClick={() => onSelect(null)}
          style={{ opacity: activeTeam ? 1 : 0.4, pointerEvents: activeTeam ? 'auto' : 'none' }}
        >
          取消选中
        </span>
      </div>
      {teams.map((team) => {
        const isActive = activeTeam === team.name
        const status = getStatusClass(team.totalProgress)

        return (
          <div
            key={team.name}
            className={`team-card${isActive ? ' active' : ''}`}
            onClick={() => onSelect(isActive ? null : team.name)}
          >
            <div className="team-card-header">
              <span className="team-name">{team.name}</span>
              <span className={`team-status ${status}`}>
                {STATUS_LABEL[status]}
              </span>
            </div>
            <div className="team-stats">
              <div className="team-stat">
                <span className="team-stat-label">负责楼层</span>
                <span className="team-stat-value">{team.floorCount}层</span>
              </div>
              <div className="team-stat">
                <span className="team-stat-label">总进度</span>
                <span
                  className="team-stat-value"
                  style={{ color: getProgressColor(team.totalProgress) }}
                >
                  {team.totalProgress}%
                </span>
              </div>
            </div>
            <div className="team-progress-bar-bg">
              <div
                className="team-progress-bar-fill"
                style={{
                  width: `${team.totalProgress}%`,
                  background: getProgressColor(team.totalProgress),
                }}
              />
            </div>
            <div className="team-floors">
              {team.floorIndices.map((fi) => (
                <span key={fi} className="floor-tag">
                  {fi + 1}层
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TeamPanel

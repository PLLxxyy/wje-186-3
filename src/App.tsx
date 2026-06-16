import React, { useState, useCallback, useMemo } from 'react'
import BuildingScene from './components/BuildingScene'
import HUD from './components/HUD'
import FloorPanel from './components/FloorList'
import TeamPanel from './components/TeamPanel'
import TimeSlider from './components/TimeSlider'
import FloorTooltip from './components/FloorTooltip'
import { ALL_SNAPSHOTS, FloorData, getTeamSummaries } from './data/constructionData'

const App: React.FC = () => {
  const [dayIndex, setDayIndex] = useState(29) // 默认第30天
  const [hoveredFloor, setHoveredFloor] = useState<number | null>(null)
  const [focusFloor, setFocusFloor] = useState<number | null>(null)
  const [activeTeam, setActiveTeam] = useState<string | null>(null)
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; floor: FloorData } | null>(null)

  const snapshot = ALL_SNAPSHOTS[dayIndex]
  const teamSummaries = useMemo(() => getTeamSummaries(snapshot), [snapshot])

  const highlightFloorIndices = useMemo(() => {
    if (!activeTeam) return []
    const team = teamSummaries.find((t) => t.name === activeTeam)
    return team ? team.floorIndices : []
  }, [activeTeam, teamSummaries])

  const handleSliderChange = useCallback((index: number) => {
    setDayIndex(index)
    setFocusFloor(null) // 切换时间时重置焦点
  }, [])

  const handleFloorSelect = useCallback((floorIndex: number) => {
    setFocusFloor(floorIndex)
  }, [])

  const handleTeamSelect = useCallback((teamName: string | null) => {
    setActiveTeam(teamName)
    if (teamName) {
      setFocusFloor(null)
    }
  }, [])

  return (
    <div className="app-container">
      {/* 3D 画布 */}
      <div className="canvas-wrap">
        <BuildingScene
          snapshot={snapshot}
          hovered={hoveredFloor}
          setHovered={setHoveredFloor}
          setTooltipData={setTooltipData}
          focusFloor={focusFloor}
          highlightFloorIndices={highlightFloorIndices}
        />
      </div>

      {/* 顶部 HUD */}
      <HUD snapshot={snapshot} dayIndex={dayIndex} />

      {/* 左侧班组看板 */}
      <TeamPanel
        teams={teamSummaries}
        activeTeam={activeTeam}
        onSelect={handleTeamSelect}
      />

      {/* 右侧楼层列表 */}
      <FloorPanel
        floors={snapshot.floors}
        activeFloor={focusFloor}
        onSelect={handleFloorSelect}
      />

      {/* 底部时间轴 */}
      <TimeSlider
        totalDays={ALL_SNAPSHOTS.length}
        currentIndex={dayIndex}
        currentDate={snapshot.date}
        onChange={handleSliderChange}
      />

      {/* 3D 悬浮提示 */}
      <FloorTooltip data={tooltipData} />
    </div>
  )
}

export default App

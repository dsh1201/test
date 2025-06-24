// ===========================================
// 整合版：數據注入與報告渲染系統
// ===========================================

// 全局變數
let analysisData = {};

// ===========================================
// 初始化與事件監聽
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializePlaceholders();
    initializeScrollTop();
    initializeResponsiveFeatures();

    if (window.analysisDataReady) {
        initializeReport();
    } else {
        document.addEventListener('analysisDataLoaded', initializeReport);
    }
});

function initializeResponsiveFeatures() {
    // 手機版菜單
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }
    
    // 響應式表格
    document.querySelectorAll('.table-responsive').forEach(container => {
        const table = container.querySelector('table');
        if (table && table.offsetWidth > container.offsetWidth) {
            container.style.overflowX = 'auto';
        }
    });
}


// 🔥 主要初始化函數
function initializeReport() {
    console.log('Initializing report with data:', analysisData);
    
    if (analysisData && Object.keys(analysisData).length > 0) {
        // 基本信息更新
        if (analysisData.qc_stats) updateQCTable(analysisData.qc_stats);
        if (analysisData.project_id) updateProjectInfo(analysisData.project_id);
        
        // 統計數據更新
        updateOverallStats(analysisData);
        updateDetailedOverallFindings(analysisData);
        
        // 組別分析
        if (analysisData.group_analysis?.group_analysis) {
            renderGroupDiversityTables(analysisData.group_analysis.group_analysis);
            updateSampleSizeWarning(analysisData.group_analysis.group_analysis);
        }
        
        // 統計表格更新
        if (analysisData.permanova_stats) updatePERMANOVATable(analysisData.permanova_stats);
        if (analysisData.anosim_stats) updateANOSIMTable(analysisData.anosim_stats);
    }
}

// ===========================================
// 數據設置與項目信息
// ===========================================

function setAnalysisData(data) {
    analysisData = data;
    window.analysisDataReady = true;
    console.log('Analysis data set:', analysisData);
    
    const event = new CustomEvent('analysisDataLoaded');
    document.dispatchEvent(event);
}

function updateProjectInfo(projectId) {
    if (projectId) {
        const sidebarProjectId = document.getElementById('sidebar-project-id');
        if (sidebarProjectId) {
            sidebarProjectId.textContent = projectId;
        }
    }
}

function updateOverallStats(analysisData) {
    const elements = {
        'group-counts': analysisData.group_count,
        'sample-counts': analysisData.sample_count,
        'phyla-counts': analysisData.group_analysis?.overall_taxa_stats?.phylum_count,
        'genus-counts': analysisData.group_analysis?.overall_taxa_stats?.genus_count,
        'species-counts': analysisData.species_count
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value) {
            element.textContent = value;
        }
    });
}

// ===========================================
// 下拉選單切換
// ===========================================
function toggleNavDropdown() {
    const dropdown = document.querySelector('.nav-dropdown');
    dropdown.classList.toggle('open');
}

// 點擊外部關閉下拉菜單
document.addEventListener('click', function(event) {
    const dropdown = document.querySelector('.nav-dropdown');
    if (!dropdown.contains(event.target)) {
        dropdown.classList.remove('open');
    }
});

// ===========================================
// 側邊欄切換
// ===========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const body = document.body;
    let overlay = document.querySelector('.sidebar-overlay');

    // 如果遮罩不存在，則創建它
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        // 點擊遮罩時關閉側邊欄
        overlay.addEventListener('click', closeSidebar);
        body.appendChild(overlay);
    }
    
    sidebar.classList.add('open');
    overlay.classList.add('active');
    body.classList.add('sidebar-open'); // 鎖定滾動
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const body = document.body;

    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    body.classList.remove('sidebar-open'); // 解除鎖定
}

// 🔥 ESC鍵關閉sidebar
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
        closeSidebar();
    }
});

// ===========================================
// 滾動到頂部按鈕
// ===========================================
function initializeScrollTop() {
    const scrollTopBtn = document.querySelector('.scroll-top');
    if (!scrollTopBtn) {
        // 如果沒有scroll-top按鈕，創建一個
        const btn = document.createElement('button');
        btn.className = 'scroll-top';
        btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        btn.setAttribute('aria-label', '回到頂部');
        document.body.appendChild(btn);
        scrollTopBtn = btn;
    }
    
    // 監聽滾動事件
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });
    
    // 點擊滾動到頂部
    scrollTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ===========================================
// QC表格處理
// ===========================================

function updateQCTable(qcData) {
    const tbody = document.querySelector('#qc-table-body');
    if (!tbody || !qcData) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="table-loading">載入中...</td></tr>';
    
    setTimeout(() => {
        tbody.innerHTML = '';
        qcData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td title="${row.sample}">${row.sample || 'N/A'}</td>
                <td>${row.raw_reads ? row.raw_reads.toLocaleString() : 'N/A'}</td>
                <td>${row.trimmed_reads ? row.trimmed_reads.toLocaleString() : 'N/A'}</td>
                <td>${row.decontaminated_reads ? row.decontaminated_reads.toLocaleString() : 'N/A'}</td>
                <td>${row.decon_raw_percent || 'N/A'}%</td>
                <td>${row.decon_trimmed_percent || 'N/A'}%</td>
            `;
            tbody.appendChild(tr);
        });
    }, 300);
}

// ===========================================
// Krona Iframe 處理
// ===========================================

function hideKronaLoading() {
    const loadingOverlay = document.getElementById('krona-loading');
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        // 動畫結束後隱藏，避免遮擋 iframe
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 300);
    }
}

function showKronaError() {
    const loadingOverlay = document.getElementById('krona-loading');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
        loadingOverlay.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #E74C3C; margin-bottom: 1rem;"></i>
            <p>無法載入互動式圖表。</p>
            <small>請確認檔案路徑是否正確或網路連線正常。</small>
        `;
    }
}

// ===========================================
// 整體多樣性統計
// ===========================================

function updateDetailedOverallFindings(analysisData) {
    const overallTaxaStats = analysisData.overall_taxa_stats || analysisData.group_analysis?.overall_taxa_stats;
    if (!overallTaxaStats) return;
    
    const overallStats = document.querySelector('.overall-stats');
    if (!overallStats) return;
    
    try {
        const dominantPhyla = overallTaxaStats.dominant_phyla || [];
        const dominantGenus = overallTaxaStats.dominant_genus || [];
        const dominantSpecies = overallTaxaStats.dominant_species || [];
        
        overallStats.innerHTML = generateOverallStatsHTML(dominantPhyla, dominantGenus, dominantSpecies, overallTaxaStats, analysisData);
        addTableInteractivity();
    } catch (error) {
        console.error('Error updating overall findings:', error);
        overallStats.innerHTML = generateErrorState();
    }
}

function generateOverallStatsHTML(dominantPhyla, dominantGenus, dominantSpecies, overallTaxaStats, analysisData) {
    return `
        <!-- <div class="col content-subtitle">
                            <h3>整體多樣性統計</h3>
                        </div>  -->
        <h3 class="mb-1 mt-3" style="color: var(--primary-color);">**整體多樣性統計**</h3>
        <div class="analysis-grid">
            ${generateTaxonomicCard('菌門', 'chart-pie', dominantPhyla, overallTaxaStats.phylum_count)}
            ${generateTaxonomicCard('菌屬', 'sitemap', dominantGenus, overallTaxaStats.genus_count)}
            ${generateTaxonomicCard('菌種', 'dna', dominantSpecies, analysisData.species_count || overallTaxaStats.species_count, true)}
        </div>
    `;
}

function generateTaxonomicCard(type, icon, data, count, isSpecies = false) {
    const rows = data.slice(0, 5).map(item => 
        `<tr>
            <td title="${item.name}" ${isSpecies ? 'class="species-name"' : ''}>${truncateName(item.name, isSpecies ? 25 : 20)}</td>
            <td><span class="abundance-value ${getAbundanceClass(item.abundance)}">${formatAbundance(item.abundance)}</span></td>
         </tr>`
    ).join('');
    
    return `
        <div class="analysis-card">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-${icon}"></i>
                    優勢${type} (${type === '菌種' ? 'Species' : type === '菌門' ? 'Phylum' : 'Genus'}) 平均相對豐度
                </h3>
            </div>
            <div class="card-content">
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="min-width: 180px;">${type}</th>
                                <th style="min-width: 120px;">平均相對豐度 (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || `<tr><td colspan="2" class="no-data">暫無${type}數據</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ===========================================
// 組別多樣性分析
// ===========================================

function renderGroupDiversityTables(groupAnalysisData) {
    const tabsNav = document.getElementById('group-tabs-nav');
    const tabsContent = document.getElementById('group-tabs-content');
    
    if (!tabsNav || !tabsContent || !groupAnalysisData) return;
    
    try {
        tabsNav.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> 載入組別分析中...</div>';
        
        setTimeout(() => {
            const groupEntries = Object.entries(groupAnalysisData);
            
            // 生成tab導航
            tabsNav.innerHTML = groupEntries.map(([groupName, groupData], index) => 
                `<button class="tab-btn ${index === 0 ? 'active' : ''}" onclick="switchGroupTab('${groupName}')">
                    ${groupName}<span class="tab-sample-count"> (n=${groupData.sample_count || 0})</span>
                </button>`
            ).join('');
            
            // 生成tab內容
            tabsContent.innerHTML = groupEntries.map(([groupName, groupData], index) => 
                generateSingleGroupTabContent(groupName, groupData, index === 0)
            ).join('');
            
            addGroupTableInteractivity();
        }, 200);
    } catch (error) {
        console.error('Error rendering group diversity tabs:', error);
    }
}

function generateSingleGroupTabContent(groupName, groupData, isActive) {
    const dominantPhyla = groupData.dominant_phyla || [];
    const dominantGenus = groupData.dominant_genus || [];
    const dominantSpecies = groupData.dominant_species || [];
    
    return `
        <div id="group-tab-${groupName}" class="tab-content ${isActive ? 'active' : ''}">
            <div class="group-tab-header">
                <div class="group-title-info">
                    <h4 class="group-name">
                        <i class="fas fa-layer-group"></i>${groupName}
                    </h4>
                    <div class="group-meta-info">
                        <span class="sample-info">
                            <i class="fas fa-vials"></i>樣本數量: ${groupData.sample_count || 0}
                        </span>
                        ${getSampleQualityIndicator(groupData.sample_count || 0)}
                    </div>
                </div>
            </div>
            
            <div class="taxonomic-tables-grid">
                ${generateTaxonomicSection('菌門', 'chart-pie', dominantPhyla, 'phylum')}
                ${generateTaxonomicSection('菌屬', 'sitemap', dominantGenus, 'genus')}
                ${generateTaxonomicSection('菌種', 'dna', dominantSpecies, 'species')}
            </div>
            
            ${generateGroupStatsSummary(groupData)}
        </div>
    `;
}

function generateTaxonomicSection(type, icon, data, level) {
    return `
        <div class="taxonomic-section">
            <h5 class="taxonomic-title">
                <i class="fas fa-${icon}"></i>優勢${type} (Dominant ${type === '菌種' ? 'Species' : type === '菌門' ? 'Phyla' : 'Genera'})
            </h5>
            <div class="table-wrapper">
                <table class="group-data-table">
                    <thead>
                        <tr>
                            <th>${type}</th>
                            <th>平均相對豐度</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateTaxonomicTableRows(data, level)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function generateTaxonomicTableRows(taxaData, taxonomicLevel) {
    if (!taxaData || taxaData.length === 0) {
        return `<tr><td colspan="2" class="no-data">暫無${getTaxonomicLevelName(taxonomicLevel)}數據</td></tr>`;
    }
    
    return taxaData.slice(0, 5).map(taxon => `
        <tr class="taxa-data-row">
            <td class="taxa-name-cell ${taxonomicLevel}-name" title="${taxon.name}">
                ${taxonomicLevel === 'species' ? 
                    `<em>${truncateName(taxon.name, 25)}</em>` : 
                    truncateName(taxon.name, 20)
                }
            </td>
            <td class="abundance-cell">
                <span class="abundance-value ${getAbundanceClass(taxon.abundance)}">
                    ${formatAbundance(taxon.abundance)}%
                </span>
            </td>
        </tr>
    `).join('');
}

function generateGroupStatsSummary(groupData) {
    return `
        <div class="group-stats-summary">
            <h5><i class="fas fa-chart-bar"></i> 多樣性統計摘要</h5>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${groupData.phylum_count || 0}</span>
                    <span class="stat-label">檢測菌門數</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${groupData.genus_count || 0}</span>
                    <span class="stat-label">檢測菌屬數</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${groupData.species_count || 0}</span>
                    <span class="stat-label">檢測物種數</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${formatDiversityIndex(groupData.alpha_diversity?.shannon)}</span>
                    <span class="stat-label">Shannon指數</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${formatDiversityIndex(groupData.alpha_diversity?.simpson)}</span>
                    <span class="stat-label">Simpson指數</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${Math.round(groupData.alpha_diversity?.observed_species || 0)}</span>
                    <span class="stat-label">觀察物種數</span>
                </div>
            </div>
        </div>
    `;
}

function switchGroupTab(groupName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const targetBtn = document.querySelector(`[onclick="switchGroupTab('${groupName}')"]`);
    const targetContent = document.getElementById(`group-tab-${groupName}`);
    
    if (targetBtn) targetBtn.classList.add('active');
    if (targetContent) targetContent.classList.add('active');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
        document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const clickedBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

// 🔥 初始化tab功能
document.addEventListener('DOMContentLoaded', function() {
    // 確保第一個tab預設為active
    const firstTabBtn = document.querySelector('.tab-btn');
    const firstTabContent = document.querySelector('.tab-content');
    
    if (firstTabBtn && !firstTabBtn.classList.contains('active')) {
        firstTabBtn.classList.add('active');
    }
    
    if (firstTabContent && !firstTabContent.classList.contains('active')) {
        firstTabContent.classList.add('active');
    }
});


// ===========================================
// 樣本大小警告與分析方法推薦
// ===========================================

function updateSampleSizeWarning(groupAnalysis) {
    const warningElement = document.getElementById('sample-size-warning');
    if (!warningElement) return;
    
    const sampleCounts = Object.values(groupAnalysis).map(g => g.sample_count || 0);
    const groupCount = Object.keys(groupAnalysis).length;
    const minSampleSize = Math.min(...sampleCounts);
    const maxSampleSize = Math.max(...sampleCounts);
    const avgSampleSize = sampleCounts.reduce((sum, count) => sum + count, 0) / sampleCounts.length;
    const totalSamples = sampleCounts.reduce((sum, count) => sum + count, 0);
    
    const { warningLevel, icon, message, recommendation } = getSampleWarningInfo(minSampleSize, avgSampleSize);
    
    warningElement.innerHTML = `
        <div class="sample-warning ${warningLevel}">
            <div class="warning-header">
                <span class="warning-icon">${icon}</span>
                <span class="warning-title">${message}</span>
            </div>
            <div class="warning-details">
                <div class="sample-stats">
                    <span><i class="fas fa-layer-group"></i> 
                        ${groupCount} 個組別
                    </span>
                    <span><i class="fas fa-vials"></i> ${totalSamples} 總樣本</span>
                    <span><i class="fas fa-chart-bar"></i> ${minSampleSize}-${maxSampleSize} 樣本/組</span>
                    <span><i class="fas fa-calculator"></i> ${avgSampleSize.toFixed(1)} 平均/組</span>
                </div>
                <div class="recommendation">
                    <i class="fas fa-info-circle"></i> ${recommendation}
                </div>
            </div>
        </div>
    `;
    
    updateAnalysisMethodsRecommendation(minSampleSize, groupCount);
}

function getSampleWarningInfo(minSampleSize, avgSampleSize) {
    if (minSampleSize < 3) {
        return {
            warningLevel: 'critical',
            icon: '🚫',
            message: '極小樣本分析',
            recommendation: '部分組別樣本數過少，統計分析結果僅供參考。建議合併組別或增加樣本數。'
        };
    } else if (minSampleSize < 5) {
        return {
            warningLevel: 'warning',
            icon: '⚠️',
            message: '小樣本分析',
            recommendation: '建議增加樣本數以提高統計檢驗力。某些多變量分析可能無法進行。'
        };
    } else if (avgSampleSize < 10) {
        return {
            warningLevel: 'info',
            icon: 'ℹ️',
            message: '中等樣本分析',
            recommendation: '樣本數適中，部分統計檢驗可能受限。建議謹慎解釋差異分析結果。'
        };
    } else {
        return {
            warningLevel: 'success',
            icon: '✅',
            message: '充足樣本分析',
            recommendation: '樣本數充足，可進行完整統計分析。所有分析方法都可以使用。'
        };
    }
}

function updateAnalysisMethodsRecommendation(minSampleSize, groupCount) {
    const methodsElement = document.getElementById('recommended-methods');
    if (!methodsElement) return;
    
    const methods = [
        { name: 'Alpha Diversity', icon: 'fas fa-chart-area', minSample: 5, minGroups: 2 },
        { name: 'PERMANOVA', icon: 'fas fa-project-diagram', minSample: 5, minGroups: 2 },
        { name: 'ANOSIM', icon: 'fas fa-sitemap', minSample: 5, minGroups: 2 },
        { name: 'Wilcoxon', icon: 'fas fa-balance-scale', minSample: 5, minGroups: 2 },
        { name: 'Kruskal-Wallis', icon: 'fas fa-chart-bar', minSample: 5, minGroups: 3 },
        { name: 'Dunn’s Test', icon: 'fas fa-balance-scale', minSample: 5, minGroups: 3 },
        { name: 'LEfSe', icon: 'fas fa-search', minSample: 5, minGroups: 2 },
        { name: 'MetaStats', icon: 'fas fa-dna', minSample: 5, minGroups: 2 },
        { name: 'metagenomeSeq', icon: 'fas fa-chart-line', minSample: 5, minGroups: 2 },
        { name: 'ANCOM-BC2', icon: 'fas fa-chart-pie', minSample: 5, minGroups: 2 }
    ];
    
    const isSufficientSample = minSampleSize >= 5 && groupCount >= 2;
    
    if (isSufficientSample) {
        methodsElement.innerHTML = `
            <div class="methods-showcase-simple">
                <div class="showcase-header-simple">
                    <i class="fas fa-check-circle success-icon-small"></i>
                    <span class="showcase-title-simple">可用完整統計分析</span>
                </div>
                <div class="methods-grid-simple">
                    ${methods.map(method => createSimpleMethodTag(method, true)).join('')}
                </div>
            </div>
        `;
    } else {
        const availableMethods = methods.filter(m => minSampleSize >= m.minSample && groupCount >= m.minGroups);
        const unavailableMethods = methods.filter(m => minSampleSize < m.minSample || groupCount < m.minGroups);
        
        methodsElement.innerHTML = `
            ${availableMethods.length ? 
                `<div class="available-methods-simple">
                    <h6><i class="fas fa-check success-color"></i> 可用方法</h6>
                    <div class="methods-grid-simple">${availableMethods.map(m => createSimpleMethodTag(m, true)).join('')}</div>
                 </div>` : ''}
            ${unavailableMethods.length ? 
                `<div class="unavailable-methods-simple">
                    <h6><i class="fas fa-times warning-color"></i> 樣本數不足而不能使用的方法</h6>
                    <div class="methods-grid-simple">${unavailableMethods.map(m => createSimpleMethodTag(m, false)).join('')}</div>
                 </div>` : ''}
        `;
    }
}

function createSimpleMethodTag(method, isAvailable) {
    return `
        <div class="method-tag-simple ${isAvailable ? 'available' : 'unavailable'}" 
             title="${method.name}${isAvailable ? ' - 可用' : ' - 樣本數不足'}">
            <i class="${method.icon} method-icon-small"></i>
            <span class="method-name-simple">${method.name}</span>
        </div>
    `;
}

// ===========================================
// 統計表格更新
// ===========================================

function updatePERMANOVATable(permanovaData) {
    updateStatisticalTable('#permanova-table tbody', permanovaData, 5, 'PERMANOVA', (row) => [
        formatGroupComparison(row.Groups),
        parseFloat(row.F).toFixed(3),
        parseFloat(row.R2).toFixed(3),
        parseFloat(row.p_adjusted).toFixed(3),
        formatSignificance(row.Significance)
    ]);
}

function updateANOSIMTable(anosimData) {
    updateStatisticalTable('#anosim-table tbody', anosimData, 4, 'ANOSIM', (row) => [
        formatGroupComparison(row.Groups),
        parseFloat(row.R).toFixed(3),
        parseFloat(row.p_adjusted).toFixed(3),
        formatSignificance(row.Significance)
    ]);
}

function updateStatisticalTable(selector, data, colCount, tableName, rowMapper) {
    const tableBody = document.querySelector(selector);
    if (!tableBody || !data) return;
    
    tableBody.innerHTML = `<tr><td colspan="${colCount}" class="table-loading">載入${tableName}數據中...</td></tr>`;
    
    setTimeout(() => {
        tableBody.innerHTML = '';
        data.forEach((row) => {
            const tr = document.createElement('tr');
            tr.innerHTML = rowMapper(row).map(cell => `<td>${cell}</td>`).join('');
            tableBody.appendChild(tr);
        });
    }, 300);
}

// ===========================================
// 圖片處理與Placeholder
// ===========================================

function initializePlaceholders() {
    autoUpdatePlaceholders();
    
    document.querySelectorAll('.viz-placeholder').forEach(placeholder => {
        placeholder.addEventListener('click', function() {
            if (this.classList.contains('missing-data') || this.classList.contains('error-state')) return;
            
            const analysisType = this.closest('.analysis-card').querySelector('.card-title').textContent.trim();
            loadAnalysisResult(this, analysisType);
        });
    });
}

async function autoUpdatePlaceholders() {
    const placeholders = document.querySelectorAll('.viz-placeholder');
    for (const placeholder of placeholders) {
        const analysisType = placeholder.closest('.analysis-card').querySelector('.card-title').textContent.trim();
        await checkAndUpdatePlaceholder(placeholder, analysisType);
    }
}

async function checkAndUpdatePlaceholder(placeholder, analysisType) {
    const imageConfig = getImageConfig(analysisType);
    if (!imageConfig) return;
    
    const imageExists = await checkImageExists(imageConfig.src);
    if (imageExists) {
        updatePlaceholderWithImage(placeholder, imageConfig);
    } else {
        updatePlaceholderForMissingImage(placeholder, imageConfig);
    }
}

function checkImageExists(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
}

function getImageConfig(analysisType) {
    const configs = {
        'Alpha 多樣性指標箱形圖': {
            src: '../04.Statistics/Alpha_Diversity/alpha_diversity_boxplot.png',
            alt: 'Alpha diversity 箱形圖',
            title: 'Alpha diversity 箱形圖',
            description: 'Chao1, Shannon, Simpson, Pielou 多樣性指標分佈情況',
            filePath: '04.Statistics/Alpha_Diversity/alpha_diversity_boxplot.png'
        },
        '主成份分析': {
            src: '../05.Visualization/01.Ordination/pca_ellipse.png',
            alt: '主成份分析 (PCA) 圖',
            title: '主成份分析圖',
            description: 'PCA 多變量分析結果',
            filePath: '05.Visualization/01.Ordination/pca_(*).png'
        },
        '主座標分析': {
            src: '../05.Visualization/01.Ordination/pcoa_ellipse.png',
            alt: '主座標分析 (PCoA) 圖',
            title: '主座標分析圖',
            description: 'PCoA 多變量分析結果',
            filePath: '05.Visualization/01.Ordination/pcoa_(*).png'
        },
        '無母數多維尺度分析': {
            src: '../05.Visualization/01.Ordination/nmds_ellipse.png',
            alt: '無母數多維尺度分析 (NMDS) 圖',
            title: '無母數多維尺度分析圖',
            description: 'NMDS 多變量分析結果',
            filePath: '05.Visualization/01.Ordination/nmds_(*).png'
        },
        'LEfSe 柱狀圖': {
            src: '../05.Visualization/02.Taxa_Abundance/Taxonomy_LEfSe_LDA2.png',
            alt: 'LEfSe 柱狀圖',
            title: 'LEfSe 柱狀圖',
            description: 'LDA Score > 2.0 的顯著差異物種柱狀圖',
            filePath: '05.Visualization/02.Taxa_Abundance/Taxonomy_LEfSe_(*).png'
        },
        'LEfSe 分類樹狀圖': {
            src: '../05.Visualization/02.Taxa_Abundance/cladogram.png',
            alt: 'LEfSe 分類樹狀圖',
            title: 'LEfSe 分類樹狀圖',
            description: 'LDA Score > 2.0 的顯著差異物種分類樹狀圖',
            filePath: '05.Visualization/02.Taxa_Abundance/cladogram.png'
        },
        'MetagenomeSeq': {
            src: '../04.Statistics/metagenomeSeq/metagenomeSeq_species.wo_unclassified.png',
            alt: 'MetagenomeSeq 分析結果',
            title: 'MetagenomeSeq 差異分析結果',
            description: '零膨脹高斯模型分析 (FDR < 0.05)',
            filePath: '04.Statistics/metagenomeSeq/metagenomeSeq_(*).png'
        },
        'ANCOM-BC2': {
            src: '../04.Statistics/ANCOMBC2/ANCOMBC2_pair_heatmap.Species.png',
            alt: 'ANCOM-BC2 分析結果',
            title: 'ANCOM-BC2 差異分析結果',
            description: 'ANOVA-like Differential Expression Analysis (FDR < 0.05)',
            filePath: '04.Statistics/ANCOMBC2/ANCOMBC2_(*).png'
        },
        'MetaStats': {
            src: '../04.Statistics/metastats/metastats_genus.wo_unclassified.png',
            alt: 'MetaStats 分析結果',
            title: 'MetaStats 差異分析結果',
            description: 'MetaStats 多變量分析 (FDR < 0.05)',
            filePath: '04.Statistics/metastats/metastat_(*).png'
        },
        'Wilcoxon Rank Sum Test': {
            src: '../04.Statistics/Wilcoxon/Wilcoxon_species.wo_unclassified.png',
            alt: 'Wilcoxon Rank Sum Test 分析結果',
            title: 'Wilcoxon Rank Sum Test 差異分析結果',
            description: 'Wilcoxon Rank Sum Test (FDR < 0.05)',
            filePath: '04.Statistics/Wilcoxon/Wilcoxon_(*).png'
        },
        'Kruskal-Wallis Test': {
            src: '../04.Statistics/Kruskal_Wallis/Kruskal_Wallis_species.wo_unclassified.png',
            alt: 'Kruskal-Wallis Test 分析結果',
            title: 'Kruskal-Wallis Test 差異分析結果',
            description: 'Kruskal-Wallis Test (FDR < 0.05)',
            filePath: '04.Statistics/Kruskal_Wallis/Kruskal_Wallis_(*).png'
        },
        'Dunn’s Test': {
            src: '../04.Statistics/Kruskal_Wallis_Dunn/Kruskal_Wallis_Dunn_species.wo_unclassified.png',
            alt: 'Dunn’s Kruskal-Wallis Multiple Comparisons 分析結果',
            title: 'Dunn’s 多重比較分析結果',
            description: 'Dunn’s 多重比較分析 (FDR < 0.05)',
            filePath: '04.Statistics/Kruskal_Wallis_Dunn/Kruskal_Wallis_Dunn_(*).png'
        },
    };
    return configs[analysisType] || null;
}

function updatePlaceholderWithImage(placeholder, imageData) {
    placeholder.outerHTML = `
        <div class="image-container">
            <img src="${imageData.src}" alt="${imageData.alt}" class="analysis-image"
                 onclick="openImageModal(this.src)" onerror="handleImageError(this, '${imageData.src}')">
            <div class="image-caption">
                <strong>${imageData.title}</strong><br>
                <small>${imageData.description}</small>
                ${imageData.filePath ? `<br><small class="file-path">
                    <i class="fas fa-folder-open"></i>
                    路徑：${imageData.filePath}</small>` : ''
                }
            </div>
        </div>
    `;
}

function handleImageError(imageElement, src) {
    // 防止無限迴圈的 onerror
    imageElement.onerror = null;

    // 替換為錯誤提示
    const container = imageElement.closest('.image-container');
    if (container) {
        container.innerHTML = `
            <div class="viz-placeholder error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>圖片載入失敗</p>
                <small>檔案遺失或路徑錯誤: ${src}</small>
            </div>
        `;
    }
}

function updatePlaceholderForMissingImage(placeholder, imageConfig) {
    placeholder.className = 'viz-placeholder missing-data';
    placeholder.innerHTML = `
        <i class="fas fa-image" style="opacity: 0.3;"></i>
        <p style="color: var(--text-secondary);">分析未達最低樣本條件或分析結果無顯著差異，因此無法產生分析結果</p>
        <small style="color: var(--text-secondary); font-style: italic;">預期路徑：${imageConfig.filePath || imageConfig.src}</small>
    `;
}

function loadAnalysisResult(placeholder, analysisType) {
    placeholder.innerHTML = `
        <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--primary-color);"></i>
        <p>載入${analysisType}分析結果中...</p>
    `;
    
    setTimeout(async () => {
        await checkAndUpdatePlaceholder(placeholder, analysisType);
    }, 1000);
}

// ===========================================
// 導航與交互功能
// ===========================================

function initializeNavigation() {
    // 🔥 新增：導航連結點擊處理
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // 移除所有active類
            navLinks.forEach(l => l.classList.remove('active'));
            // 添加active到當前連結
            this.classList.add('active');
            
            // 平滑滾動到目標section
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // 🔥 額外：在手機版自動關閉sidebar
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar && window.innerWidth <= 1024) {
                        sidebar.classList.remove('open');
                    }
                }
            }
        });
    });
    
    // 🔥 新增：滾動監聽，自動高亮當前section的導航
    const sections = document.querySelectorAll('section, .content-section');
    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                if (id) {
                    // 移除所有active類
                    navLinks.forEach(l => l.classList.remove('active'));
                    // 找到對應的導航連結並添加active
                    const activeLink = document.querySelector(`.nav-link[href="#${id}"]`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            }
        });
    }, observerOptions);
    
    sections.forEach(section => {
        if (section.id) {
            observer.observe(section);
        }
    });
    
    // 原有功能：鍵盤導航支持
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // 關閉sidebar
            document.getElementById('sidebar')?.classList.remove('open');
            // 關閉下拉菜單
            document.querySelector('.nav-dropdown')?.classList.remove('open');
            // 關閉圖片模態框
            closeImageModal();
        }
    });
    
    // 原有功能：響應式表格滾動
    document.querySelectorAll('.data-table').forEach(table => {
        const wrapper = document.createElement('div');
        wrapper.style.overflowX = 'auto';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });
}


// ===========================================
// 工具函數
// ===========================================

function formatAbundance(abundance) {
    if (typeof abundance !== 'number') return 'N/A';
    return abundance >= 10 ? abundance.toFixed(1) : abundance.toFixed(2);
}

function formatDiversityIndex(value) {
    if (typeof value !== 'number') return 'N/A';
    return value.toFixed(3);
}

function truncateName(name, maxLength) {
    if (!name || typeof name !== 'string') return 'N/A';
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
}

function getTaxonomicLevelName(level) {
    const levelNames = { 'phylum': '菌門', 'genus': '菌屬', 'species': '菌種' };
    return levelNames[level] || level;
}

function getAbundanceClass(abundance) {
    if (typeof abundance !== 'number') return 'no-data';
    if (abundance >= 20) return 'high-abundance';
    if (abundance >= 10) return 'medium-abundance';
    return 'low-abundance';
}

function getSampleQualityIndicator(sampleCount) {
    if (sampleCount >= 10) return '<span class="quality-indicator high" title="樣本數充足">✅</span>';
    if (sampleCount >= 5) return '<span class="quality-indicator medium" title="樣本數中等">⚠️</span>';
    return '<span class="quality-indicator low" title="樣本數較少">⚠️</span>';
}

function formatGroupComparison(groupStr) {
    return groupStr.replace(/[_]/g, ' ').trim();
}

function formatSignificance(significance) {
    const sigMap = {
        '***': '<span class="badge badge-accent">***</span>',
        '**': '<span class="badge badge-accent">**</span>',
        '*': '<span class="badge badge-accent">*</span>'
    };
    return sigMap[significance] || '<span class="badge badge-info">ns</span>';
}

function addTableInteractivity() {
    document.querySelectorAll('.data-table tbody tr').forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'var(--hover-color)';
            this.style.transform = 'translateX(2px)';
        });
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
            this.style.transform = '';
        });
    });
}

function addGroupTableInteractivity() {
    document.querySelectorAll('.taxa-data-row').forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'var(--hover-color)';
        });
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
}

function generateErrorState() {
    return `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>載入整體統計時發生錯誤</h4>
            <p>請檢查數據格式或聯繫技術支援</p>
        </div>
    `;
}

// ===========================================
// 圖片模態框功能（來自image-modal.js）
// ===========================================

function openImageModal(imageSrc) {
    let modal = document.getElementById('imageModal');
    
    // 如果modal不存在，創建它
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'image-modal';
        modal.innerHTML = `
            <span class="close" onclick="closeImageModal()">&times;</span>
            <img id="modalImage" alt="放大圖片">
        `;
        document.body.appendChild(modal);
    }
    
    const modalImg = document.getElementById('modalImage');
    modal.style.display = 'block';
    modalImg.src = imageSrc;
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ESC鍵關閉modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeImageModal();
    }
});

// 點擊背景關閉modal
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('image-modal')) {
        closeImageModal();
    }
});

// ===========================================
// 回到頂部功能 (對應 HTML onclick)
// ===========================================

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

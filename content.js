// 币安合约计算器手续费插件
(function() {
    'use strict';
    
    // 配置参数
    let FEE_RATE = 0.05; // 默认手续费率 0.05%, 0.02%
    let FEE_TYPE = 'taker'; // maker 或 taker
    let CONTRACT_VALUE = 1; // 默认合约面值

    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPlugin);
    } else {
        initPlugin();
    }
    
    function initPlugin() {
        console.log('币安合约计算器手续费插件已加载');
        
        // 监听计算按钮点击事件
        setTimeout(() => {
            const calculateButton = findCalculateButton();
            if (calculateButton && !calculateButton.hasAttribute('data-fee-plugin')) {
                calculateButton.setAttribute('data-fee-plugin', 'true');
                calculateButton.addEventListener('click', handleCalculate);
            }
        }, 1000);
        
        // 添加手续费设置界面
        addFeeSettingsUI();
    }
    
    function findCalculateButton() {
        // 查找计算按钮
        const buttons = document.querySelectorAll('.bn-button.bn-button__primary');
        for (let button of buttons) {
            if (button.textContent.includes('计算') || button.textContent.includes('Calculate')) {
                return button;
            }
        }
        return null;
    }
    
    function addFeeSettingsUI() {
        // 创建手续费设置面板
        const settingsPanel = document.createElement('div');
        settingsPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #29313D;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #333B47;
            z-index: 1000;
            min-width: 200px;
        `;
        
        settingsPanel.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #EAECEF;">
                手续费设置
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px; color: #929AA5; font-size: 12px;">
                    手续费率 (%)
                </label>
                <input type="number" id="fee-rate-input" value="0.04" step="0.01" min="0" 
                       style="width: 100%; padding: 5px; background: #202630; border: 1px solid #333B47; 
                              color: #EAECEF; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px; color: #929AA5; font-size: 12px;">
                    手续费类型
                </label>
                <select id="fee-type-select" 
                        style="width: 100%; padding: 5px; background: #202630; border: 1px solid #333B47; 
                               color: #EAECEF; border-radius: 4px;">
                    <option value="taker">Taker</option>
                    <option value="maker">Maker</option>
                </select>
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px; color: #929AA5; font-size: 12px;">
                    币种面值
                </label>
                <input type="number" id="contract-value-input" value="1" step="0.0001" min="0.0001" 
                       style="width: 100%; padding: 5px; background: #202630; border: 1px solid #333B47; 
                              color: #EAECEF; border-radius: 4px;">
            </div>
            <button id="apply-fee-settings" 
                    style="width: 100%; padding: 8px; background: #F0B90B; color: #202630; 
                           border: none; border-radius: 4px; cursor: pointer;">
                应用设置
            </button>
        `;
        
        document.body.appendChild(settingsPanel);
        
        // 应用设置按钮事件
        document.getElementById('apply-fee-settings').addEventListener('click', function() {
            const feeRateInput = document.getElementById('fee-rate-input');
            const feeTypeSelect = document.getElementById('fee-type-select');
            const contractValueInput = document.getElementById('contract-value-input');
            
            FEE_RATE = parseFloat(feeRateInput.value) / 100;
            FEE_TYPE = feeTypeSelect.value;
            CONTRACT_VALUE = parseFloat(contractValueInput.value);
            
            alert(`手续费设置已更新: ${feeRateInput.value}% (${feeTypeSelect.value}), 1张=${CONTRACT_VALUE}`);
        });
    }
    
    function handleCalculate() {
        setTimeout(() => {
            // 获取计算按钮并检查是否已禁用
            const calculateButton = document.querySelector('.bn-button.bn-button__primary');
            if (calculateButton && calculateButton.classList.contains('inactive')) {
                return; // 按钮禁用时不计算
            }
            
            // 获取输入值
            const inputs = document.querySelectorAll('input[aria-label="input field"]');
            if (inputs.length < 3) return;
            
            // 开仓价格、平仓价格、成交数量（超过1000后会除以1000）
            const entryPrice = parseFloat(inputs[1].value);
            const exitPrice = parseFloat(inputs[2].value);
            const quantityInput = inputs[3].value;
            
            if (!entryPrice || !exitPrice || !quantityInput) return;
            
            // 获取当前币种和合约类型信息
            const quantitySuffix = document.querySelector('.bn-textField-suffix .t-subtitle1');
            if (!quantitySuffix) return;
            
            const suffixText = quantitySuffix.textContent;

            // 通用币本位识别：包含币种符号但不包含USDT/BUSD
            const isCoinBased = !suffixText.includes('USDT') && !suffixText.includes('BUSD');
            const isContractBased = suffixText.includes('USDT') || suffixText.includes('BUSD');
            // 输出信息
            // window.alert(suffixText);

            let totalFee, feeUnit;
            if (isCoinBased) {
                // 币本位合约：手续费以币计价币种计算
                const contractQuantity = parseFloat(quantityInput);
                const entryFee = (contractQuantity * CONTRACT_VALUE / entryPrice) * FEE_RATE;
                totalFee = 2*entryFee;
                
                // 从后缀提取币种符号
                feeUnit = "coin";
            } else if (isContractBased) {
                // U本位合约：手续费以USDT计算
                const quantity = parseFloat(quantityInput);
                const entryFee = entryPrice * quantity * FEE_RATE;
                totalFee = 2*entryFee;
                feeUnit = 'USDT';
            } else {
                return;
            }
            
            // 获取结果元素
            const resultElements = getResultElements();
            if (!resultElements) return;
            // 盈亏、回报率%、起始保证金
            const { profitElement, roiElement, marginElement } = resultElements;
            
            // 解析原始值
            const originalProfit = parseValue(profitElement.textContent);
            const originalROI = parseValue(roiElement.textContent);
            const margin = parseValue(marginElement.textContent);

            // 计算净盈亏和净回报率
            const netProfit = originalProfit - totalFee;
            const netROI = netProfit/margin*100;
            
            // 更新显示
            updateResultDisplay(profitElement, netProfit, getProfitUnit(profitElement.textContent));
            updateResultDisplay(roiElement, netROI, '%');
            
            // 添加手续费信息
            addFeeInfo(totalFee, feeUnit);
        }, 500);
    }
    
    function getResultElements() {
        // 通用方法获取结果元素
        const resultContainer = document.querySelector('.flex.flex-col.max-md\\:justify-start.md\\:justify-between.rounded-\\[12px\\].p-\\[12px\\].border-\\[1px\\].border-solid.border-Line');
        if (!resultContainer) return null;
        
        const elements = resultContainer.querySelectorAll('.flex.items-center.justify-between.py-\\[4px\\]');
        if (elements.length < 3) return null;
        
        return {
            marginElement: elements[0].querySelector('.t-subtitle2'),
            profitElement: elements[1].querySelector('.t-subtitle2'),
            roiElement: elements[2].querySelector('.t-subtitle2')
        };
    }
    
    function parseValue(text) {
        // 通用值解析方法
        const numericValue = text.replace(/[^\d.-]/g, '');
        return numericValue ? parseFloat(numericValue) : 0;
    }
    
    function getProfitUnit(text) {
        // 从盈亏文本中提取单位
        const unitMatch = text.match(/[A-Z%]+$/);
        return unitMatch ? unitMatch[0] : 'USDT';
    }
    
    function updateResultDisplay(element, value, unit) {
        // 通用结果显示更新
        const formattedValue = Math.abs(value) >= 1000 ? value.toFixed(0) : value.toFixed(2);
        element.textContent = `${value >= 0 ? '+' : ''}${formattedValue}${unit}`;
        element.style.color = value >= 0 ? '#2EBD85' : '#F6465D';
    }
    
    function addFeeInfo(totalFee, feeUnit) {
        // 查找结果容器
        const resultsContainer = document.querySelector('.flex.flex-col.max-md\\:justify-start.md\\:justify-between.rounded-\\[12px\\].p-\\[12px\\].border-\\[1px\\].border-solid.border-Line');
        if (!resultsContainer) return;
        
        // 移除现有的手续费信息
        const existingFeeInfo = resultsContainer.querySelector('.fee-info-plugin');
        if (existingFeeInfo) {
            existingFeeInfo.remove();
        }
        
        // 创建手续费信息元素
        const feeInfo = document.createElement('div');
        feeInfo.className = 'fee-info-plugin flex items-center justify-between py-[4px]';
        feeInfo.innerHTML = `
            <div class="t-body3 max-md:text-SecondaryText md:text-TertiaryText">手续费</div>
            <div class="t-subtitle2" style="color: #707A8A;">${totalFee.toFixed(6)} ${feeUnit}</div>
        `;
        
        // 插入到结果容器中
        const resultElements = resultsContainer.querySelectorAll('.flex.items-center.justify-between.py-\\[4px\\]');
        if (resultElements.length >= 3) {
            resultElements[2].parentNode.insertBefore(feeInfo, resultElements[2].nextSibling);
        }
    }
    
})();
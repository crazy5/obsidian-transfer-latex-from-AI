import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

export default class TransferLatexFromAIPlugin extends Plugin {
    async onload() {
        console.log('Loading Transfer LaTeX from AI Plugin');

        // 添加命令：读取并替换当前文档中的 LaTeX 公式为 MathJax 语法
        this.addCommand({
            id: 'convert-latex-to-mathjax',
            name: 'Convert LaTeX to MathJax',
			icon: 'sigma',
            callback: () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    this.convertLatexToMathJax();
                }
            }
        });

        // 在菜单栏添加图标，点击时触发相同的转换功能
        this.addRibbonIcon('sigma', 'Convert LaTeX to MathJax', () => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                this.convertLatexToMathJax();
            }
        });
    }

    // 卸载插件时的清理
    onunload() {
        console.log('Unloading Transfer LaTeX from AI Plugin');
    }

    // 读取当前打开的文档内容并进行 LaTeX 到 MathJax 的替换
    async convertLatexToMathJax() {
        const activeFile = this.app.workspace.getActiveFile();

        if (!activeFile) {
            return;
        }

        // 读取当前文件内容
        const fileContent = await this.app.vault.read(activeFile);

        // 执行 LaTeX 到 MathJax 的替换
        const convertedContent = this.convertLatexSyntax(fileContent);

        // 更新文档内容
        await this.app.vault.modify(activeFile, convertedContent);

        console.log("LaTeX to MathJax conversion completed.");
    }

    /**
     * 替换函数：把 LaTeX 定界符改写为 Obsidian 的 MathJax 语法
     *   \\( ... \\)  -> $ ... $        （双反斜杠，AI 输出被转义的情况）
     *   \\[ ... \\]  -> $$ ... $$      （双反斜杠，AI 输出被转义的情况）
     *   \( ... \)    -> $ ... $
     *   \[ ... \]    -> $$ ... $$
     *
     * 注意顺序：双反斜杠形式必须在前。否则 \\(x\\) 会从第二个反斜杠开始
     * 被单反斜杠规则匹配，残留下多余的 \ ，变成 \$x\$。
     */
    convertLatexSyntax(content: string): string {
        let updatedContent = content;

        // 1. 双反斜杠块级公式 \\[ ... \\] -> $$ ... $$
        updatedContent = updatedContent.replace(
            /\\\\\[\s*([\s\S]*?)\s*\\\\\]/g,
            (match, formula) => `$$${formula.trim()}$$`
        );

        // 2. 双反斜杠行内公式 \\( ... \\) -> $ ... $
        updatedContent = updatedContent.replace(
            /\\\\\(\s*([\s\S]*?)\s*\\\\\)/g,
            (match, formula) => `$${formula.trim()}$`
        );

        // 3. 单反斜杠块级公式 \[ ... \] -> $$ ... $$
        // (?<!\\) 确保前面不是反斜杠，避免误吃残留的双反斜杠
        updatedContent = updatedContent.replace(
            /(?<!\\)\\\[\s*([\s\S]*?)\s*\\\]/g,
            (match, formula) => `$$${formula.trim()}$$`
        );

        // 4. 单反斜杠行内公式 \( ... \) -> $ ... $
        updatedContent = updatedContent.replace(
            /(?<!\\)\\\(\s*([\s\S]*?)\s*\\\)/g,
            (match, formula) => `$${formula.trim()}$`
        );

        return updatedContent;
    }
}

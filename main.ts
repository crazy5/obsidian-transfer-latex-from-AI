import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';

export default class TransferLatexFromAIPlugin extends Plugin {
    async onload() {
        // 命令：把当前笔记中的 LaTeX 定界符转换为 MathJax 语法
        // editorCallback 保证命令只在 Markdown 编辑器处于激活状态时可用
        this.addCommand({
            id: 'convert-latex-to-mathjax',
            name: 'Convert LaTeX to MathJax',
            icon: 'sigma',
            editorCallback: (editor) => this.convertEditorContent(editor),
        });

        // 左侧工具栏按钮，效果与命令一致
        this.addRibbonIcon('sigma', 'Convert LaTeX to MathJax', () => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                this.convertEditorContent(view.editor);
            }
        });
    }

    // 命令与工具栏图标由插件框架托管，卸载时自动清理，无需 onunload

    /**
     * 转换编辑器中当前笔记的全部内容。
     *
     * 使用 Editor API 而不是 Vault.modify：转换结果进入编辑器的撤销栈，
     * 可正常 Ctrl+Z 回退，也不会丢掉编辑器维护的选区等状态。
     */
    convertEditorContent(editor: Editor) {
        const original = editor.getValue();
        const converted = this.convertLatexSyntax(original);

        if (converted === original) {
            new Notice('No LaTeX delimiters found.');
            return;
        }

        editor.setValue(converted);
        new Notice('LaTeX converted to MathJax.');
    }

    /**
     * 替换函数：把 LaTeX 定界符改写为 Obsidian 的 MathJax 语法
     *   \\( ... \\)  -> $ ... $        （双反斜杠，AI 输出被转义的情况）
     *   \\[ ... \\]  -> $$ ... $$      （双反斜杠，AI 输出被转义的情况）
     *   \( ... \)    -> $ ... $
     *   \[ ... \]    -> $$ ... $$
     *
     * 顺序：双反斜杠形式必须在前，否则 \\(x\\) 会从第二个反斜杠开始被
     * 单反斜杠规则匹配，残留下多余的 \ ，变成 \$x\$。
     *
     * 兼容性：单反斜杠规则用「前一个字符是否为 \」来判断，而不是正则
     * lookbehind —— 旧版 iOS WebView 不支持 lookbehind，会导致插件加载失败。
     */
    convertLatexSyntax(content: string): string {
        let updatedContent = content;

        // 1. 双反斜杠块级公式 \\[ ... \\] -> $$ ... $$
        updatedContent = updatedContent.replace(
            /\\\\\[\s*([\s\S]*?)\s*\\\\\]/g,
            (match, formula: string) => `$$${formula.trim()}$$`
        );

        // 2. 双反斜杠行内公式 \\( ... \\) -> $ ... $
        updatedContent = updatedContent.replace(
            /\\\\\(\s*([\s\S]*?)\s*\\\\\)/g,
            (match, formula: string) => `$${formula.trim()}$`
        );

        // 3. 单反斜杠块级公式 \[ ... \] -> $$ ... $$
        updatedContent = updatedContent.replace(
            /\\\[\s*([\s\S]*?)\s*\\\]/g,
            (match, formula: string, offset: number, source: string) =>
                source[offset - 1] === '\\' ? match : `$$${formula.trim()}$$`
        );

        // 4. 单反斜杠行内公式 \( ... \) -> $ ... $
        updatedContent = updatedContent.replace(
            /\\\(\s*([\s\S]*?)\s*\\\)/g,
            (match, formula: string, offset: number, source: string) =>
                source[offset - 1] === '\\' ? match : `$${formula.trim()}$`
        );

        return updatedContent;
    }
}
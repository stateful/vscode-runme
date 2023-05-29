import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

export interface ISelectedCategory {
    name: string
}
@customElement('category-selector')
export class CategorySelector extends LitElement {

    static styles = css`
    .category-selector-form {
        display: flex;
        align-items:flex-end;
        max-width:650px;
    }

    :host([appearance="secondary"]) {
        background: red;
    }

    .category-item {
        min-width: 200px;
    }

    .dropdown-container {
        box-sizing: border-box;
        display: flex;
        flex-flow: row nowrap;
        align-items: flex-start;
        justify-content: flex-start;
    }
    .dropdown-container label {
        display: block;
        color: var(--vscode-foreground);
        cursor: pointer;
        padding: 0.4rem;
        font-size: var(--vscode-font-size);
        line-height: normal;
        margin-bottom: 2px;
    }

    .category-item::part(control) {
        background-color: var(--theme-input-background);
        color: var(--vscode-foreground);
        border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
    }
    .category-item::part(root) {
        background: transparent;
        border: none;
        color: var(--vscode-foreground);
    }
    .category-item::part(label) {
        color: var(--vscode-foreground);
    }
    .category-item::part(checked-indicator) {
        fill: var(--vscode-foreground);
    }
    .row {
        width: 100%;
    }
    .category-item::part(control) {
        background-color: var(--theme-input-background);
        color: var(--vscode-foreground);
        border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
    }

    .annotation-item::part(control) {
        background-color: var(--theme-input-background);
        color: var(--vscode-foreground);
        border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
    }

    .annotation-item::part(root) {
        background: transparent;
        border:none;
        color: var(--vscode-foreground);
    }

    .annotation-item::part(label) {
        color: var(--vscode-foreground);
    }

    @media only screen and (max-width: 600px) {
        .category-selector-form {
            flex-direction:column;
        }
    }

    `

    @property({ type: String })
    categories: string = ''

    @property({ type: String })
    createNewCategoryText: string | undefined

    @property({ type: String })
    selectCategoryText: string | undefined

    @property()
    selectedCategory: string | undefined

    @property()
    description: string | undefined

    @property()
    identifier: string | undefined


    private onCreateNewCategory(e: Event) {
        if (e.defaultPrevented) {
            e.preventDefault()
        }
        const event = new CustomEvent('onCreateNewCategory')
        this.dispatchEvent(event)
    }

    private onSelectCategory(e: Event) {
        if (e.defaultPrevented) {
            e.preventDefault()
        }
        const event = new CustomEvent('onSelectCategory')
        this.dispatchEvent(event)
    }

    private onChange(e: any){
        if (e.defaultPrevented) {
            e.preventDefault()
        }
        const event = new CustomEvent('onChange', {
            detail: e.target.value
        })
        this.dispatchEvent(event)
    }

    render() {
        return html`
            <div class="category-selector-form">
                <div class="row">
                    ${html`<vscode-text-field
                    type="text"
                    value="${this.selectedCategory}"
                    size="30"
                    @change="${this.onChange}"
                    readonly
                    class="annotation-item">
                    <b>${this.identifier}: </b>${this.description}
                    </vscode-text-field>`
                }
                </div>
                <div class="row">
                ${when(this.categories.length, 
                    () => html`
                    <vscode-button 
                        style="color: var(--vscode-button-foreground);
                        background-color:var(--vscode-button-background);"
                        @click="${this.onSelectCategory}">
                        ${this.selectCategoryText}
                    </vscode-button>`, () => html``)}
                    <vscode-button appearance="secondary"
                            style="color: var(--vscode-button-foreground);"
                            @click="${this.onCreateNewCategory}">
                        ${this.createNewCategoryText}
                    </vscode-button>
                </div>
            </div>    
        `
    }
}
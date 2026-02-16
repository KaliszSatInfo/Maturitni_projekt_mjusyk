import { metadataFields, visibleMetadata, saveSettingsState} from "../state/settings";

export function renderMetadataOptions(
    container: HTMLElement, 
    onChange: () => void
) {
    metadataFields.forEach(field => {
        const label = document.createElement("label");
        label.className = "metadata-option";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = field;
        checkbox.checked = visibleMetadata.has(field);

        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                visibleMetadata.add(field);
            } else {
                visibleMetadata.delete(field);
            }

            saveSettingsState();
            onChange();
        });

        label.appendChild(checkbox);
        label.appendChild(
            document.createTextNode(
                " " + field.charAt(0).toUpperCase() + field.slice(1)
            )
        );
        container.appendChild(label);
    });
}
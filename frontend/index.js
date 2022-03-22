import {
    Box,
    Heading,
    initializeBlock,    
    useSettingsButton,
    useGlobalConfig,
    useRecordById,
    useCursor,
    useLoadable,
    Text,
    Switch,
    useBase,
    useViewMetadata,
    useWatchable,
    FieldIcon,
} from '@airtable/blocks/ui';
import {cursor} from '@airtable/blocks';
import {FieldType} from '@airtable/blocks/models';
import React from 'react';
import {useState} from 'react';

const FIELD_CELL_WIDTH_PERCENTAGE = '35%';
const FIELD_DESCRIPTION_CELL_WIDTH_PERCENTAGE = '65%';

let showEmptyValues = false;


function TableStructureApp() {
    // useBase will re-render the app whenever the base's configuration changes: this includes
    // updates to names, descriptions and field options, as well as tables/fields being added or
    // removed. This means the app will always show the latest structure.
    const base = useBase();

    // useWatchable is used to re-render the app whenever the active table or view changes.
    useWatchable(cursor, ['activeTableId', 'activeViewId']);

    
    const [isShowingSettings, setIsShowingSettings] = useState(false);
    useSettingsButton(function() {
        setIsShowingSettings(!isShowingSettings);
    });

    // table can be null if it's a new table being created and activeViewId can be null while the
    // table is loading, so we use "ifExists" to allow for these situations.
    const table = base.getTableByIdIfExists(cursor.activeTableId);
    const view = table && table.getViewByIdIfExists(cursor.activeViewId);
    
    if (isShowingSettings) {
        return <SettingsComponent base={base} table={table} view={view} />;
    }

    if (table && view) {
        return <TableSchema base={base} table={table} view={view} />;
    } else {
        // Still loading table and/or view.
        return null;
    }
}

function SettingsComponent({base, table, view}){
    const viewMetadata = useViewMetadata(view);
    console.log(viewMetadata)

        
    const globalConfig = useGlobalConfig();
    showEmptyValues = globalConfig.get("ShowEmptyValues");
    const [isEnabled, setIsEnabled] = useState(showEmptyValues);    
    const setSettingValue = (newValue) => {
        setIsEnabled(newValue)
        globalConfig.setAsync("ShowEmptyValues", newValue);
    }

    return (
        <Box>
            <Box padding={3} borderBottom="thick">
                <Heading size="small" margin={0}>
                Edit settings for : {table.name} / {view.name}
                </Heading>
                {/* Show the table description only if it exists */}
                {table.description && (
                    <Text textColor="light" style={{whiteSpace: 'pre'}}>
                        {table.description}
                    </Text>
                )}
            </Box>
            <Box margin={3}>
                <Row hasThickBorderBottom={true}>
                    <Cell width={FIELD_CELL_WIDTH_PERCENTAGE}>
                        <Text textColor="light">Field</Text>
                    </Cell>
                    <Cell width={FIELD_DESCRIPTION_CELL_WIDTH_PERCENTAGE}>
                        <Text textColor="light">Enable/Disable</Text>
                    </Cell>
                </Row>

                <Row>
                    <Cell width={FIELD_CELL_WIDTH_PERCENTAGE}>
                        <Text fontWeight="strong"> GLOBAL configuration : Show empty values </Text>
                    </Cell>
                    <Cell width={FIELD_DESCRIPTION_CELL_WIDTH_PERCENTAGE}>
                        <Switch
                            value={isEnabled}
                            onChange={newValue => setSettingValue(newValue)}
                            label=""                    
                            backgroundColor="transparent"
                            width="320px"
                        />
                    </Cell>
                </Row>

                {viewMetadata.visibleFields.map(field => {
                    return <FieldSettingsRow base={base} table={table} field={field} key={field.id} />;
                })}
            </Box>
        </Box>
    )
}

function TableSchema({base, table, view}) {
    // We read the fields from viewMetadata instead of using table.fields because fields are only
    // ordered in the context of a specific view.
    // Also, this allows us to only show the fields visible within the selected view.
    const viewMetadata = useViewMetadata(view);

    const imgStyle = {
        margin: 'auto',
        display: 'block'
    }

    return (
        <Box>
            <Box padding={3} borderBottom="thick">
                <Heading size="small" margin={0}>
                    {table.name} / {view.name}
                </Heading>
                {/* Show the table description only if it exists */}
                {table.description && (
                    <Text textColor="light" style={{whiteSpace: 'pre'}}>
                        {table.description}
                    </Text>
                )}
            </Box>
            <Box margin={3}>
                <HeaderRow />
                {viewMetadata.visibleFields.map(field => {
                    return <FieldRow base={base} table={table} field={field} key={field.id} />;
                })}
            </Box>
            
            <Box margin={3}>
                <img src="https://www.oecd.org/media/oecdorg/about/images/logooecd_en.png" style={{margin: 'auto', display: 'block' }}></img>
            </Box>
        </Box>
    );
}

// Presentational header row helper component.
function HeaderRow() {
    return (
        <Row hasThickBorderBottom={true}>
            <Cell width={FIELD_CELL_WIDTH_PERCENTAGE}>
                <Text textColor="light">Field</Text>
            </Cell>
            <Cell width={FIELD_DESCRIPTION_CELL_WIDTH_PERCENTAGE}>
                <Text textColor="light">Field value</Text>
            </Cell>
        </Row>
    );
}

function FieldRow({table, field}) {
    
    const globalConfig = useGlobalConfig();
    
    let initState = globalConfig.get(field.name);
    
    const cursor = useCursor();
    // cursor.selectedRecordIds isn't loaded by default, so we need to load it
    // explicitly with the useLoadable hook. The rest of the code in the
    // component will not run until it has loaded.
    useLoadable(cursor);
    
    // Re-render the app whenever the selected records change.
    useWatchable(cursor, ['selectedRecordIds']);
    
    if(initState){
        return (            
            <DisplayValue field={field} table={table} selectedRecordIds={cursor.selectedRecordIds}>
            </DisplayValue>
        );  
    } else {
        return null
    }
}

function DisplayValue({field, table, selectedRecordIds}){

    const fieldType = getHumanReadableFieldType(field);
    // Check value, if empty we try not to display it
    let value = ""
    if(cursor.selectedRecordIds.length > 0){        
        const record = useRecordById(table, cursor.selectedRecordIds[0]);
        if(field.type === "singleSelect" ){
            value = record._data.cellValuesByFieldId[field._id].name
        } else {
            value = record._data.cellValuesByFieldId[field._id]
        }
        if(value){
            // quite bad here : find a solution/logic to avoid line break and spacing 
            value = value.trim()
        }
    }
    let CellValue = null
    if(selectedRecordIds.length > 0){
        const record = useRecordById(table, selectedRecordIds[0]);
        // console.log(record)

        if(field.type === "singleSelect" ){
            CellValue = (
                <Text variant="paragraph" margin={0}>
                    {record._data.cellValuesByFieldId[field._id].name}
                </Text>
            )
        } else {
            CellValue =  (
                <Text variant="paragraph" margin={0}>
                    {record._data.cellValuesByFieldId[field._id]}
                </Text>
            )
        }
    } else {
        CellValue =  (
            <Text variant="paragraph" margin={0} style={{whiteSpace: 'pre'}}>
                Nothing selected
            </Text>
        )
    }

    if(value || showEmptyValues ){        
        return (
        <Row>
            <Cell width={FIELD_CELL_WIDTH_PERCENTAGE}>
                <Text fontWeight="strong">{field.name}</Text>
                <Text textColor="light" display="flex" alignItems="center" marginTop={1}>
                    <FieldIcon field={field} marginRight={1} /> {fieldType}
                </Text>
            </Cell>
            <Cell width={FIELD_DESCRIPTION_CELL_WIDTH_PERCENTAGE}>
                <Text variant="paragraph" margin={0} style={{whiteSpace: 'pre'}}>
                    {field.value}
                </Text>
                {CellValue}
            </Cell>
        </Row>
        )        
    } else {
        return null
    }
    
}

function FieldSettingsRow({field}) {
    
    const globalConfig = useGlobalConfig();
    const fieldType = getHumanReadableFieldType(field);

    let initState = globalConfig.get(field.name);
    const [isEnabled, setIsEnabled] = useState(initState);    
    
    console.log(globalConfig)

    const setSettingValue = (newValue) => {
        setIsEnabled(newValue)
        globalConfig.setAsync(field.name, newValue);
    }

    return (
        <Row>
            <Cell width={FIELD_CELL_WIDTH_PERCENTAGE}>
                <Text fontWeight="strong">{field.name}</Text>
                <Text textColor="light" display="flex" alignItems="center" marginTop={1}>
                    <FieldIcon field={field} marginRight={1} /> {fieldType}
                </Text>
            </Cell>
            <Cell width={FIELD_DESCRIPTION_CELL_WIDTH_PERCENTAGE}>
                <Text variant="paragraph" margin={0} style={{whiteSpace: 'pre'}}>
                    {field.description}
                </Text>
                <Switch
                    value={isEnabled}
                    onChange={newValue => setSettingValue(newValue)}
                    label=""                    
                    backgroundColor="transparent"
                    width="320px"
                />
            </Cell>
        </Row>
    );
}

function getHumanReadableFieldType(field) {
    // Format the field types to more closely match those in Airtable's UI
    switch (field.type) {
        case FieldType.DATE_TIME:
            return 'Date with time';
        case FieldType.MULTILINE_TEXT:
            return 'Long text';
        case FieldType.MULTIPLE_ATTACHMENTS:
            return 'Attachments';
        case FieldType.MULTIPLE_RECORD_LINKS:
            return 'Linked records';
        case FieldType.MULTIPLE_SELECTS:
            return 'Multiple select';
        case FieldType.URL:
            return 'URL';
        default:
            // For everything else, just convert it from camel case
            // https://stackoverflow.com/questions/4149276/how-to-convert-camelcase-to-camel-case
            return field.type
                .replace(/([A-Z])/g, ' $1')
                .toLowerCase()
                .replace(/^./, function(str) {
                    return str.toUpperCase();
                });
    }
}

// Renders the content in a horizontal row.
function Row({children, isHeader}) {
    return (
        <Box display="flex" borderBottom={isHeader ? 'thick' : 'default'} paddingY={2}>
            {children}
        </Box>
    );
}

// Renders a table cell with border and children.
function Cell({children, width}) {
    return (
        <Box flex="none" width={width} paddingRight={1}>
            {children}
        </Box>
    );
}

initializeBlock(() => <TableStructureApp />);

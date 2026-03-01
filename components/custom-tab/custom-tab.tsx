import { Plus } from "lucide-react";
import { cloneElement, isValidElement, useState } from "react";
import CustomSelector, {
  SelectorPros,
} from "../custom-selector/custom-selector";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import AssignmentsRow, {
  AssignmentsRowProps,
} from "../escalistas/assigments-row";
import { MultiSelector } from "../ui/multi-selector";
import { ActionResponse } from "@/hooks/useUserAssignmentManager";
export type CustomTabList = {
  value: string;
  label: string;
  icon: React.ReactNode;
  content?: CustomTabContent;
};

export type CustomTabContent = {
  handleActionClick?: () => Promise<ActionResponse>;
  disabledActionButton?: boolean;
  secondFieldOptions?: SelectorPros;
  label?: string;
  placeHolder?: string;
  assigmentLabel?: string;
  assignments?: AssignmentsRowProps[];
};
interface CustomTabProps {
  tabs: CustomTabList[];
  iconClassName?: string;
  defaultRole?: string;
}

const TabContentComponent = ({
  handleActionClick,
  disabledActionButton,
  secondFieldOptions,
  label,
  assigmentLabel,
}: CustomTabContent) => {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">{label}</h3>
      <div className={`grid grid-cols-2 gap-2`}>
        {/* {firstFieldOptions && firstFieldOptions.options.length > 0 && (
          <CustomSelector {...firstFieldOptions} />
        )} */}
        <MultiSelector
          multiple={false}
          items={secondFieldOptions?.options || []}
          value={[secondFieldOptions?.selectedValue || ""]}
          onChange={(val) => secondFieldOptions?.onValueChange(val as string)}
          renderer={{
            getId: (table) => table.value,
            getSearchText: (table) => `${table.display} `,
            getDisplayText: (table) => table.display,
            // getSecondaryText: (table) => "dfadsfadsf",
          }}
          // label="Usuários"
          placeholder={secondFieldOptions?.placeholder}
          searchPlaceholder="Digite nome ou email..."
          allowPinning={true}
          pinnedStorageKey={`pinned${assigmentLabel}`}
          getSelectionText={(count) =>
            `${count} usuário${count > 1 ? "s" : ""} selecionado${
              count > 1 ? "s" : ""
            }`
          }
        />
        <Button
          onClick={async () => {
            
            if (handleActionClick) {
              console.log("🔗 Button clicked - calling handleActionClick");
              const response = await handleActionClick();
              console.log("📝 Response from handleActionClick:", response);
              // Toast é exibido dentro do handleActionClick
            }
          }}
          disabled={disabledActionButton}
          size="sm"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export const CustomTab = ({
  tabs,
  iconClassName = "w-4 h-4",
}: CustomTabProps) => {
  const finalList = tabs.filter((tab) => tab.content);

  // Se não há tabs com conteúdo, não renderizar nada
  if (finalList.length === 0) {
    return null;
  }

  const applyIconClass = (icon: React.ReactNode) => {
    if (isValidElement(icon)) {
      return cloneElement(icon, {
        className: iconClassName,
      } as any);
    }
    return icon;
  };
  return (
    <div>
      <Tabs defaultValue={finalList[0]?.value || "groups"} className="w-full">
        <TabsList className={`grid w-full grid-cols-${finalList.length}`}>
          {finalList.map((tab, index) => {
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-2"
              >
                {applyIconClass(tab.icon)}
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {finalList.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content && (
              <>
                <TabContentComponent {...tab.content} />
                {tab.content.assignments &&
                  tab.content.assignments.length > 0 && (
                    <div className="border rounded-lg p-4 mt-2">
                      <h3 className="text-sm font-medium mb-3">{`${tab.content.assigmentLabel} atuais`}</h3>
                      {tab.content.assignments.map((assignmentProps, idx) => (
                        <div key={idx} className="mt-2">
                          <AssignmentsRow {...assignmentProps} />
                        </div>
                      ))}
                    </div>
                  )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

// Angular
import { Component, OnInit, Input, ViewChild } from "@angular/core";
// ng-bootstrap
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
// Modals
import { ModalModuleComponent } from "../../../modals/modal-module/modal-module.component";
// Services
import { ModuleService } from "src/app/core/services/API/module.service";
//import { SessionService } from 'src/app/core/services/API/session.service';

// Constants
import {
   SWAL_DELETE_MODULE,
   SWAL_SUCCESS_DELETE_MODULE
} from "src/app/config/swal_config";
// ngx-sweetalert2
import { SwalComponent } from "@toverux/ngx-sweetalert2";

@Component({
   selector: "cw-modules",
   templateUrl: "./modules.component.html",
   styleUrls: ["./modules.component.scss"]
})
export class ModulesComponent implements OnInit {
   @Input() id_course;

   // Hace referencia al template 'successSwal'
   @ViewChild("successSwal") private successSwal: SwalComponent;

   SWAL_DELETE_MODULE = SWAL_DELETE_MODULE;
   SWAL_SUCCESS_DELETE_MODULE = SWAL_SUCCESS_DELETE_MODULE;
   //id_user;
   modules;

   constructor(
      private _moduleSrv: ModuleService,
      //private _sessionSrv: SessionService,
      private ngModal: NgbModal
   ) {}

   ngOnInit() {
      this.getModules();
   }

   createModule() {
      const modalRef = this.ngModal.open(ModalModuleComponent);
      modalRef.componentInstance.action = 'Crear';
      modalRef.componentInstance.id_course = this.id_course;

      modalRef.result.then(result => {
         console.log(`result: ${result}, ${typeof result}`);
         if (result) this.getModules();
      });
   }

   getModules() {
      this._moduleSrv
         .getModulesByCourseId(this.id_course)
         .subscribe((value: any) => {
            console.log("modulos: ", value);
            this.modules = value;
         });
   }

   updateModule(module) {
      const modalRef = this.ngModal.open(ModalModuleComponent);
      modalRef.componentInstance.action = "Actualizar";
      modalRef.componentInstance.module = module;

      modalRef.result.then(
         result => {
            if (result) this.getModules();
         },
         () => {}
      );
   }

   deleteModule(id_module) {
      this._moduleSrv.deleteModule(id_module).subscribe(
         result => {
            console.log("result: ", result);
            this.successSwal.show();
            this.getModules();
         },
         error => {
            console.log("error:", error);
         }
      );
   }
}
